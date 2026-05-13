import pytest
from app.config import settings
import hmac
import hashlib

@pytest.mark.asyncio
async def test_salla_webhook_missing_signature(async_client):
    response = await async_client.post("/api/v1/webhooks/salla", json={"event": "test"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid signature"

@pytest.mark.asyncio
async def test_salla_webhook_valid_signature(async_client):
    payload_json = f'{{"event": "{settings.salla_event_name}", "data": {{"id": 123}}}}'.encode('utf-8')
    secret = settings.salla_webhook_secret.encode('utf-8')
    valid_signature = hmac.new(secret, payload_json, hashlib.sha256).hexdigest()
    
    headers = {"x-salla-signature": valid_signature, "Content-Type": "application/json"}
    
    response = await async_client.post("/api/v1/webhooks/salla", content=payload_json, headers=headers)
    
    # Just asserting it passes the signature barrier
    assert response.status_code != 401
