import hmac
import hashlib
from app.config import settings

class SallaService:
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> bool:
        if not signature:
            return False
        
        secret = settings.salla_webhook_secret.encode('utf-8')
        calculated_signature = hmac.new(
            key=secret,
            msg=payload,
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(calculated_signature, signature)
