import pytest
from app.services.whatsapp_service import WhatsAppService
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_send_template_message_success():
    whatsapp_service = WhatsAppService()
    
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"messages": [{"id": "wamid.123"}]}
    
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = mock_response
        response = await whatsapp_service.send_template_message("+966501234567", "abandoned_cart_reminder")
        
        assert "messages" in response
        assert response["messages"][0]["id"] == "wamid.123"
        mock_post.assert_called_once()
