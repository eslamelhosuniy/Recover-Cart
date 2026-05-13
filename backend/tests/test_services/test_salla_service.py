import hmac
import hashlib
from app.services.salla_service import SallaService
from app.config import settings

def test_verify_webhook_signature_valid():
    payload = b'{"event": "test"}'
    secret = settings.salla_webhook_secret.encode('utf-8')
    valid_signature = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    
    assert SallaService.verify_webhook_signature(payload, valid_signature) == True

def test_verify_webhook_signature_invalid():
    payload = b'{"event": "test"}'
    invalid_signature = "wrong_signature"
    
    assert SallaService.verify_webhook_signature(payload, invalid_signature) == False
