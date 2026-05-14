import httpx
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    BASE_URL = "https://graph.facebook.com/v17.0"

    async def send_template_message(self, to_phone: str, template_name: str, language_code: str = "ar", components: list = None) -> dict:
        url = f"{self.BASE_URL}/{settings.whatsapp_phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {settings.whatsapp_token}",
            "Content-Type": "application/json"
        }
        
        formatted_phone = to_phone.lstrip('+').lstrip('0')

        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }
        
        if components:
            payload["template"]["components"] = components

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                response.raise_for_status()
                logger.info(f"WhatsApp message sent successfully to {formatted_phone}")
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp API error: {e.response.text}")
            raise Exception(f"WhatsApp API Error: {e.response.text}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            raise
