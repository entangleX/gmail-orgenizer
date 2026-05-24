"""Email bucketing and classification logic."""

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

class EmailBucketer:
    """Classifies emails into buckets based on labels and content."""

    BUCKETS = [
        'attachments',
        'promotions',
        'newsletters',
        'otp_security',
        'latest_jobs',
        'jobs',
        'spam_junk',
        'shopping',
        'shopping_receipts',
        'government_id',
        'institutional',
        'finance',
        'travel',
        'social',
        'updates',
        'educational',
        'legal',
        'other',
    ]
    
    ATTACHMENT_KEYWORDS = ['attachment', 'attached', 'invoice attached', 'attached file', 'resume attached']
    PROMOTIONS_KEYWORDS = ['sale', 'discount', 'offer', 'coupon', 'promo', 'deal', 'save now', 'limited time', 'exclusive', 'shop', 'clearance', 'cashback']
    NEWSLETTER_KEYWORDS = ['newsletter', 'digest', 'weekly update', 'daily update', 'unsubscribe', 'read more', 'top stories']
    OTP_KEYWORDS = ['otp', 'one-time password', 'one time password', 'verification code', 'security code', 'login code', '2fa', 'two-factor']
    JOBS_KEYWORDS = ['job', 'recruiter', 'resume', 'interview', 'hiring', 'application', 'candidate', 'naukri', 'linkedin jobs', 'indeed']
    SPAM_JUNK_KEYWORDS = ['winner', 'lottery', 'claim now', 'urgent action required', 'act immediately', 'free gift', 'you have won', 'suspicious login']
    SHOPPING_KEYWORDS = ['order', 'delivered', 'shipment', 'shipping', 'receipt', 'invoice', 'payment received', 'purchase', 'tracking']
    SHOPPING_SENDER_KEYWORDS = ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'ebay', 'etsy', 'shopify', 'store', 'shopping']
    GOVERNMENT_ID_KEYWORDS = ['aadhaar', 'aadhar', 'pan card', 'passport', 'voter id', 'driving license', 'drivers license', 'irs', 'tax notice', 'government', 'gov.in', 'uidai', 'income tax', 'social security', 'ssn', 'visa application']
    INSTITUTIONAL_KEYWORDS = ['university', 'college', 'school', 'institute', 'institution', 'registrar', 'admission', 'alumni', 'library', '.edu', 'edu.in', 'coursera', 'udemy', 'edx']
    FINANCE_KEYWORDS = ['bank', 'statement', 'credit card', 'debit card', 'transaction', 'upi', 'loan', 'tax', 'mutual fund', 'portfolio']
    TRAVEL_KEYWORDS = ['flight', 'boarding pass', 'hotel', 'booking', 'reservation', 'itinerary', 'trip', 'visa', 'airbnb', 'uber']
    ENTERTAINMENT_KEYWORDS = ['movie', 'music', 'netflix', 'prime video', 'hotstar', 'spotify', 'ticket', 'concert', 'game']
    PAYMENT_KEYWORDS = ['payment', 'paid', 'autopay', 'bill', 'refund', 'upi', 'transaction', 'debited', 'credited']
    BANK_KEYWORDS = ['bank', 'account', 'statement', 'credit card', 'debit card', 'loan']
    SOCIAL_KEYWORDS = ['mentioned', 'replied', 'tagged', 'facebook', 'twitter', 'instagram', 'linkedin', 'social']
    UPDATES_KEYWORDS = ['update', 'notification', 'alert', 'reminder', 'notification', 'account update']
    LEGAL_KEYWORDS = ['legal', 'terms', 'privacy', 'policy', 'agreement', 'clause', 'contract', 'disclaimer']
    EDUCATIONAL_KEYWORDS = ['course', 'assignment', 'homework', 'exam', 'grade', 'class', 'lecture', 'educational', '.edu', 'university', 'college', 'school']
    
    @staticmethod
    def extract_email_from_headers(headers):
        """Extract sender email from message headers."""
        if not headers:
            return ''
        
        for header in headers.get('headers', []):
            if header['name'] == 'From':
                return header['value']
        return ''

    @staticmethod
    def extract_date_from_headers(headers):
        """Extract sent date from message headers."""
        if not headers:
            return ''

        for header in headers.get('headers', []):
            if header['name'] == 'Date':
                return header['value']
        return ''

    @staticmethod
    def extract_header_value(headers, names):
        """Extract selected header values without reading message bodies."""
        if not headers:
            return ''

        names = {name.lower() for name in names}
        values = [
            header.get('value', '')
            for header in headers.get('headers', [])
            if header.get('name', '').lower() in names
        ]
        return ' '.join(values).lower()

    @classmethod
    def has_attachment(cls, payload):
        """Detect attachments from metadata and header-level MIME signals."""
        header_values = cls.extract_header_value(
            payload,
            ['Content-Type', 'Content-Disposition', 'X-Attachment-Id']
        )
        if any(signal in header_values for signal in ['attachment', 'filename=', 'name=', 'multipart/mixed']):
            return True

        parts = list(payload.get('parts', []) or [])

        while parts:
            part = parts.pop()
            filename = part.get('filename')
            body = part.get('body', {}) or {}
            if filename or body.get('attachmentId'):
                return True
            parts.extend(part.get('parts', []) or [])

        return False

    @staticmethod
    def get_age_info(email, sent_at):
        """Return stable age metadata for filtering cleanup candidates."""
        sent_datetime = None
        internal_date = email.get('internalDate')

        if internal_date:
            sent_datetime = datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc)
        elif sent_at:
            try:
                sent_datetime = parsedate_to_datetime(sent_at)
                if sent_datetime.tzinfo is None:
                    sent_datetime = sent_datetime.replace(tzinfo=timezone.utc)
            except (TypeError, ValueError):
                sent_datetime = None

        if not sent_datetime:
            return {
                'age_days': None,
                'age_group': 'unknown_age',
                'age_label': 'Unknown age',
            }

        age_days = max((datetime.now(timezone.utc) - sent_datetime).days, 0)

        if age_days >= 1825:
            age_group = '5y_plus'
            age_label = '5+ years old'
        elif age_days >= 1095:
            age_group = '3y_plus'
            age_label = '3+ years old'
        elif age_days >= 730:
            age_group = '2y_plus'
            age_label = '2+ years old'
        elif age_days >= 365:
            age_group = '1y_plus'
            age_label = '1+ year old'
        else:
            age_group = 'under_1y'
            age_label = 'Under 1 year'

        return {
            'age_days': age_days,
            'age_group': age_group,
            'age_label': age_label,
        }

    @staticmethod
    def match_any(content, keywords):
        return any(keyword in content for keyword in keywords)

    @classmethod
    def collect_tags(cls, label_ids, content, has_attachment):
        tags = set()

        tag_rules = [
            ('attachment', has_attachment),
            ('otp', cls.match_any(content, cls.OTP_KEYWORDS)),
            ('spam_like', cls.match_any(content, cls.SPAM_JUNK_KEYWORDS)),
            ('job', cls.match_any(content, cls.JOBS_KEYWORDS)),
            ('promotion', cls.match_any(content, cls.PROMOTIONS_KEYWORDS) or 'CATEGORY_PROMOTIONS' in label_ids),
            ('newsletter', cls.match_any(content, cls.NEWSLETTER_KEYWORDS)),
            ('receipt', cls.match_any(content, cls.SHOPPING_KEYWORDS)),
            ('shopping', cls.match_any(content, cls.SHOPPING_SENDER_KEYWORDS)),
            ('government_id', cls.match_any(content, cls.GOVERNMENT_ID_KEYWORDS)),
            ('institutional', cls.match_any(content, cls.INSTITUTIONAL_KEYWORDS)),
            ('finance', cls.match_any(content, cls.FINANCE_KEYWORDS)),
            ('bank', cls.match_any(content, cls.BANK_KEYWORDS)),
            ('payment', cls.match_any(content, cls.PAYMENT_KEYWORDS)),
            ('travel', cls.match_any(content, cls.TRAVEL_KEYWORDS)),
            ('education', cls.match_any(content, cls.EDUCATIONAL_KEYWORDS)),
            ('legal', cls.match_any(content, cls.LEGAL_KEYWORDS)),
            ('social', cls.match_any(content, cls.SOCIAL_KEYWORDS) or 'CATEGORY_SOCIAL' in label_ids),
            ('update', cls.match_any(content, cls.UPDATES_KEYWORDS) or 'CATEGORY_UPDATES' in label_ids),
        ]

        for tag, matches in tag_rules:
            if matches:
                tags.add(tag)

        if 'promotion' in tags and cls.match_any(content, cls.JOBS_KEYWORDS):
            tags.add('career_promo')
        if 'promotion' in tags and cls.match_any(content, cls.EDUCATIONAL_KEYWORDS):
            tags.add('edu_promo')
        if 'promotion' in tags and cls.match_any(content, cls.ENTERTAINMENT_KEYWORDS):
            tags.add('entertainment_promo')
        if 'promotion' in tags and cls.match_any(content, ['shop', 'order', 'coupon', 'cashback', 'deal']):
            tags.add('shopping_promo')

        return sorted(tags)

    @staticmethod
    def sender_domain(sender):
        email_part = sender
        if '<' in sender and '>' in sender:
            email_part = sender.split('<', 1)[1].split('>', 1)[0]
        if '@' in email_part:
            return email_part.split('@')[-1].strip().lower()
        return ''

    @classmethod
    def result(cls, bucket, reason, email, subject, sender, sent_at, tags):
        age_info = cls.get_age_info(email, sent_at)
        tags = sorted(set(tags + [age_info['age_group']]))
        return {
            'bucket': bucket,
            'reason': reason,
            'email_id': email.get('id'),
            'subject': subject[:140],
            'sender': cls.sender_domain(sender),
            'sent_at': sent_at,
            'size_estimate': email.get('sizeEstimate', 0),
            'tags': tags,
            **age_info,
        }
    
    @staticmethod
    def extract_subject_from_headers(headers):
        """Extract subject from message headers."""
        if not headers:
            return ''
        
        for header in headers.get('headers', []):
            if header['name'] == 'Subject':
                return header['value'].lower()
        return ''
    
    @classmethod
    def bucket_email(cls, email):
        """
        Classify an email into a bucket based on labels and content.
        
        Returns: dict with bucket info
        """
        label_ids = email.get('labelIds', [])
        payload = email.get('payload', {})
        subject = cls.extract_subject_from_headers(payload)
        sender = cls.extract_email_from_headers(payload)
        sent_at = cls.extract_date_from_headers(payload)
        sender_lower = sender.lower()
        mime_headers = cls.extract_header_value(
            payload,
            ['Content-Type', 'Content-Disposition', 'X-Attachment-Id']
        )

        combined_content = f"{subject} {sender_lower} {mime_headers}"
        has_attachment = cls.has_attachment(payload)
        tags = cls.collect_tags(label_ids, combined_content, has_attachment)
        age_info = cls.get_age_info(email, sent_at)

        if has_attachment or cls.match_any(combined_content, cls.ATTACHMENT_KEYWORDS):
            return cls.result('attachments', 'Attachment metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.OTP_KEYWORDS):
            return cls.result('otp_security', 'OTP or security code', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.SPAM_JUNK_KEYWORDS):
            return cls.result('spam_junk', 'Spam-like content', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.JOBS_KEYWORDS):
            bucket = 'latest_jobs' if age_info['age_days'] is not None and age_info['age_days'] <= 30 else 'jobs'
            reason = 'Latest job email' if bucket == 'latest_jobs' else 'Job or recruiter content'
            return cls.result(bucket, reason, email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.GOVERNMENT_ID_KEYWORDS):
            return cls.result('government_id', 'Government or ID-related metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.INSTITUTIONAL_KEYWORDS):
            return cls.result('institutional', 'Institutional metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.SHOPPING_SENDER_KEYWORDS):
            return cls.result('shopping', 'Shopping metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.SHOPPING_KEYWORDS):
            return cls.result('shopping_receipts', 'Shopping or receipt metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.FINANCE_KEYWORDS):
            return cls.result('finance', 'Finance metadata', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.TRAVEL_KEYWORDS):
            return cls.result('travel', 'Travel metadata', email, subject, sender, sent_at, tags)
        
        # Check Gmail's native categories
        if 'CATEGORY_PROMOTIONS' in label_ids:
            return cls.result('promotions', 'Gmail category', email, subject, sender, sent_at, tags)
        
        if 'CATEGORY_SOCIAL' in label_ids:
            return cls.result('social', 'Gmail category', email, subject, sender, sent_at, tags)
        
        if 'CATEGORY_UPDATES' in label_ids:
            return cls.result('updates', 'Gmail category', email, subject, sender, sent_at, tags)
        
        # Legal/Terms
        if cls.match_any(combined_content, cls.LEGAL_KEYWORDS):
            return cls.result('legal', 'Metadata match', email, subject, sender, sent_at, tags)
        
        # Educational
        if cls.match_any(combined_content, cls.EDUCATIONAL_KEYWORDS):
            return cls.result('educational', 'Metadata match', email, subject, sender, sent_at, tags)
        
        # Promotions (secondary check)
        if cls.match_any(combined_content, cls.PROMOTIONS_KEYWORDS):
            return cls.result('promotions', 'Metadata match', email, subject, sender, sent_at, tags)

        if cls.match_any(combined_content, cls.NEWSLETTER_KEYWORDS):
            return cls.result('newsletters', 'Newsletter metadata', email, subject, sender, sent_at, tags)
        
        # Social (secondary check)
        if cls.match_any(combined_content, cls.SOCIAL_KEYWORDS):
            return cls.result('social', 'Metadata match', email, subject, sender, sent_at, tags)
        
        # Default: other
        return cls.result('other', 'Default', email, subject, sender, sent_at, tags)
    
    @classmethod
    def bucket_emails(cls, emails):
        """
        Classify multiple emails into buckets.
        
        Returns: dict with buckets as keys and email lists as values
        """
        buckets = {bucket: [] for bucket in cls.BUCKETS}
        
        for email in emails:
            bucketed = cls.bucket_email(email)
            bucket_name = bucketed['bucket']
            buckets[bucket_name].append(bucketed)
        
        return buckets
