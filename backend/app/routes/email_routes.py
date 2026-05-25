"""Email operations routes."""

from flask import Blueprint, request, jsonify, session
from app.services.gmail_service import GmailService
from app.services.email_bucketer import EmailBucketer
from app.services.cleanup_job_queue import CleanupJobQueue

email_bp = Blueprint('emails', __name__, url_prefix='/api/emails')
gmail_service = GmailService()
email_bucketer = EmailBucketer()
cleanup_jobs = CleanupJobQueue(gmail_service)
GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify'

def has_scope(creds_dict, scope):
    if scope == GMAIL_MODIFY_SCOPE and 'granted_scopes' not in creds_dict:
        return False
    scopes = creds_dict.get('granted_scopes') or creds_dict.get('scopes') or []
    return scope in scopes

@email_bp.route('/fetch', methods=['POST'])
def fetch_emails():
    """Fetch and bucket user's emails."""
    data = request.get_json(silent=True) or {}
    creds_dict = data.get('credentials')
    max_results = data.get('max_results', 100)
    
    if not creds_dict:
        return jsonify({'error': 'No credentials provided'}), 400
    
    try:
        # Build Gmail service
        credentials = gmail_service.dict_to_credentials(creds_dict)
        service = gmail_service.get_gmail_service(credentials)
        
        if not service:
            return jsonify({'error': 'Failed to authenticate with Gmail'}), 500
        
        # Fetch messages
        messages = gmail_service.fetch_messages(service, max_results=max_results)
        
        if not messages:
            return jsonify({
                'success': True,
                'buckets': {bucket: [] for bucket in email_bucketer.BUCKETS},
                'total_count': 0
            })
        
        # Get detailed messages
        detailed_messages = gmail_service.batch_get_messages(service, messages, max_results=max_results)
        
        # Bucket the emails
        buckets = email_bucketer.bucket_emails(detailed_messages)
        
        return jsonify({
            'success': True,
            'buckets': buckets,
            'total_count': len(detailed_messages),
            'scan_mode': 'complete' if str(max_results).lower() == 'all' else 'limited'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/trash', methods=['POST'])
def trash_emails():
    """Queue selected emails to be moved to trash."""
    data = request.get_json(silent=True) or {}
    creds_dict = data.get('credentials')
    message_ids = data.get('message_ids', [])
    
    if not creds_dict:
        return jsonify({'error': 'No credentials provided'}), 400
    
    if not message_ids:
        return jsonify({'error': 'No message IDs provided'}), 400

    if not has_scope(creds_dict, GMAIL_MODIFY_SCOPE):
        return jsonify({'error': 'Reconnect Google cleanup permission to archive or trash emails.'}), 403
    
    try:
        job = cleanup_jobs.submit('trash', creds_dict, message_ids)
        return jsonify({
            'success': True,
            'queued': True,
            'message': f'Queued {len(message_ids)} emails for trash',
            'job': job,
        }), 202
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/archive', methods=['POST'])
def archive_emails():
    """Queue selected emails to be archived."""
    data = request.get_json(silent=True) or {}
    creds_dict = data.get('credentials')
    message_ids = data.get('message_ids', [])
    
    if not creds_dict:
        return jsonify({'error': 'No credentials provided'}), 400
    
    if not message_ids:
        return jsonify({'error': 'No message IDs provided'}), 400

    if not has_scope(creds_dict, GMAIL_MODIFY_SCOPE):
        return jsonify({'error': 'Reconnect Google cleanup permission to archive or trash emails.'}), 403
    
    try:
        job = cleanup_jobs.submit('archive', creds_dict, message_ids)
        return jsonify({
            'success': True,
            'queued': True,
            'message': f'Queued {len(message_ids)} emails for archive',
            'job': job,
        }), 202
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/jobs/<job_id>', methods=['GET'])
def get_cleanup_job(job_id):
    """Return progress for a queued cleanup job."""
    job = cleanup_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Cleanup job not found'}), 404
    return jsonify({'success': True, 'job': job})

@email_bp.route('/stats', methods=['POST'])
def get_stats():
    """Get statistics about emails in each bucket."""
    data = request.get_json(silent=True) or {}
    creds_dict = data.get('credentials')
    
    if not creds_dict:
        return jsonify({'error': 'No credentials provided'}), 400
    
    try:
        credentials = gmail_service.dict_to_credentials(creds_dict)
        service = gmail_service.get_gmail_service(credentials)
        
        if not service:
            return jsonify({'error': 'Failed to authenticate with Gmail'}), 500
        
        # Fetch messages
        messages = gmail_service.fetch_messages(service, max_results=500)
        detailed_messages = gmail_service.batch_get_messages(service, messages)
        buckets = email_bucketer.bucket_emails(detailed_messages)
        
        stats = {
            'total_emails': len(detailed_messages),
        }
        stats.update({f'{bucket}_count': len(items) for bucket, items in buckets.items()})
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
