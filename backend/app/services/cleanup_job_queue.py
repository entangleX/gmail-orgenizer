"""In-memory cleanup job queue for user-triggered Gmail actions."""

from datetime import datetime, timezone
from queue import Queue
from threading import Lock, Thread
from uuid import uuid4


TERMINAL_STATUSES = {'succeeded', 'partial', 'failed'}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class CleanupJobQueue:
    """Small FIFO worker for archive/trash jobs.

    This keeps local and single-instance Cloud Run actions responsive without
    persisting Gmail tokens or email identifiers outside process memory.
    """

    def __init__(self, gmail_service):
        self.gmail_service = gmail_service
        self.jobs = {}
        self.queue = Queue()
        self.lock = Lock()
        self.worker = Thread(target=self._worker_loop, daemon=True)
        self.worker.start()

    def submit(self, operation, credentials, message_ids):
        job_id = uuid4().hex
        job = {
            'id': job_id,
            'operation': operation,
            'status': 'queued',
            'total': len(message_ids),
            'processed': 0,
            'succeeded_count': 0,
            'failed_count': 0,
            'message': f'Queued {operation} for {len(message_ids)} emails',
            'error': None,
            'created_at': utc_now(),
            'updated_at': utc_now(),
            '_credentials': credentials,
            '_message_ids': list(message_ids),
        }

        with self.lock:
            self.jobs[job_id] = job

        self.queue.put(job_id)
        return self.get(job_id)

    def get(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            return self._snapshot(job)

    def update(self, job_id, **changes):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            job.update(changes)
            job['updated_at'] = utc_now()
            return self._snapshot(job)

    def record_message_result(self, job_id, success):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            job['processed'] += 1
            if success:
                job['succeeded_count'] += 1
            else:
                job['failed_count'] += 1
            job['message'] = (
                f"{job['operation'].title()} in progress: "
                f"{job['processed']}/{job['total']}"
            )
            job['updated_at'] = utc_now()
            return self._snapshot(job)

    def _snapshot(self, job):
        return {
            key: value
            for key, value in job.items()
            if not key.startswith('_')
        }

    def _worker_loop(self):
        while True:
            job_id = self.queue.get()
            try:
                self._run_job(job_id)
            finally:
                self.queue.task_done()

    def _run_job(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return
            operation = job['operation']
            credentials_dict = job['_credentials']
            message_ids = job['_message_ids']
            job['status'] = 'running'
            job['message'] = f'{operation.title()} job is running'
            job['updated_at'] = utc_now()

        credentials = self.gmail_service.dict_to_credentials(credentials_dict)
        service = self.gmail_service.get_gmail_service(credentials)

        if not service:
            self.update(
                job_id,
                status='failed',
                error='Failed to authenticate with Gmail',
                message='Could not start Gmail action',
                _credentials=None,
            )
            return

        def progress_callback(_message_id, success):
            self.record_message_result(job_id, success)

        if operation == 'trash':
            result = self.gmail_service.move_to_trash(
                service,
                message_ids,
                progress_callback=progress_callback
            )
            success_count = result['count']
            failed_count = len(message_ids) - success_count
            if result['success']:
                status = 'succeeded'
                error = None
                message = f'Moved {success_count} emails to trash'
            elif success_count > 0:
                status = 'partial'
                error = 'Some emails were not moved. Gmail may have rate-limited the request.'
                message = f'Moved {success_count} of {len(message_ids)} emails to trash'
            else:
                status = 'failed'
                error = (
                    'Gmail is temporarily rate limiting this account. Wait a minute, then try again.'
                    if result['rate_limited']
                    else 'Reconnect Google cleanup permission to archive or trash emails.'
                    if result['insufficient_scope']
                    else 'Failed to move selected emails to trash'
                )
                message = error
        else:
            result = self.gmail_service.archive_messages(
                service,
                message_ids,
                progress_callback=progress_callback
            )
            success_count = result['count']
            failed_count = len(message_ids) - success_count
            if result['success']:
                status = 'succeeded'
                error = None
                message = f'Archived {success_count} emails'
            elif success_count > 0:
                status = 'partial'
                error = 'Some emails were not archived. Gmail may have rate-limited the request.'
                message = f'Archived {success_count} of {len(message_ids)} emails'
            else:
                status = 'failed'
                error = (
                    'Gmail is temporarily rate limiting this account. Wait a minute, then try again.'
                    if result['rate_limited']
                    else 'Reconnect Google cleanup permission to archive or trash emails.'
                    if result['insufficient_scope']
                    else 'Failed to archive selected emails'
                )
                message = error

        self.update(
            job_id,
            status=status,
            processed=success_count + failed_count,
            succeeded_count=success_count,
            failed_count=failed_count,
            message=message,
            error=error,
            _credentials=None,
            _message_ids=[],
        )
