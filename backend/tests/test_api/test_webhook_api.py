import pytest
from app.config import settings
import hmac
import hashlib
import uuid
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_salla_webhook_missing_store(async_client):
    dummy_store_id = str(uuid.uuid4())
    headers = {"x-salla-signature": "invalid_signature"}
    response = await async_client.post(f"/api/v1/webhooks/salla?store_id={dummy_store_id}", json={"event": "test"}, headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Store not found"


@pytest.mark.asyncio
async def test_mailgun_webhook_endpoint(async_client):
    """Test POST /webhooks/mailgun/{store_id} endpoint"""
    dummy_store_id = str(uuid.uuid4())
    payload = {
        "signature": {
            "timestamp": "1725969600",
            "token": "test_token_123",
            "signature": "test_sig"
        },
        "event-data": {
            "event": "delivered",
            "id": "test_msg_123"
        }
    }
    with patch("app.repositories.email_setting_repo.EmailSettingRepository.get_by_store_id", new_callable=AsyncMock) as mock_get_store:
        mock_get_store.return_value = None
        response = await async_client.post(f"/webhooks/mailgun/{dummy_store_id}", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "ignored"
