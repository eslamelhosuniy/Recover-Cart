import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class SendGridClient:
    BASE_URL = "https://api.sendgrid.com/v3"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def add_or_update_contacts(self, list_id: str, contacts: List[Dict[str, Any]]) -> dict:
        url = f"{self.BASE_URL}/marketing/contacts"
        payload = {
            "list_ids": [list_id],
            "contacts": contacts
        }
        async with httpx.AsyncClient() as client:
            response = await client.put(url, headers=self.headers, json=payload, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def get_senders(self) -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/marketing/senders"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "result" in data:
                return data["result"]
            return []

    async def get_lists(self) -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/marketing/lists"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            data = response.json()
            if isinstance(data, dict) and "result" in data:
                return data["result"]
            return []

    async def get_suppression_groups(self) -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/asm/groups"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            data = response.json()
            if isinstance(data, list):
                return data
            return []

    async def schedule_single_send(self, campaign_id: str) -> dict:
        url = f"{self.BASE_URL}/marketing/singlesends/{campaign_id}/schedule"
        payload = {"send_at": "now"}
        async with httpx.AsyncClient() as client:
            response = await client.put(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def send_transactional_email(self, to_email: str, subject: str, html_content: str, from_email: str, from_name: str = None) -> dict:
        url = f"{self.BASE_URL}/mail/send"
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}]
        }
        if from_name:
            payload["from"]["name"] = from_name
            
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            msg_id = response.headers.get("x-message-id", "unknown")
            return {"status": "accepted", "message_id": msg_id}

    async def create_single_send(self, name: str, subject: str, list_id: str, sender_id: int, suppression_group_id: int = None, custom_unsubscribe_url: str = None, html_content: str = "") -> dict:
        url = f"{self.BASE_URL}/marketing/singlesends"
        payload = {
            "name": name,
            "send_to": {
                "list_ids": [list_id]
            },
            "email_config": {
                "subject": subject,
                "html_content": html_content,
                "sender_id": sender_id
            }
        }
        if suppression_group_id:
            payload["email_config"]["suppression_group_id"] = suppression_group_id
        elif custom_unsubscribe_url:
            payload["email_config"]["custom_unsubscribe_url"] = custom_unsubscribe_url
        else:
            payload["email_config"]["custom_unsubscribe_url"] = "https://example.com/unsubscribe"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()
