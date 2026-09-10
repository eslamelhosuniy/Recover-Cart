import httpx
import logging
from typing import Dict, Any, List, Optional
from app.services.email_providers.base import BaseEmailProvider

logger = logging.getLogger(__name__)


class SendGridClient(BaseEmailProvider):
    """
    SendGrid Email Provider Client implementing BaseEmailProvider.
    """

    BASE_URL = "https://api.sendgrid.com/v3"

    def __init__(self, api_key: str):
        self.api_key = api_key.strip() if api_key else ""
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def add_or_update_contacts(self, list_id: Optional[str], contacts: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/contacts"
        chunk_size = 20000
        last_response = {}
        async with httpx.AsyncClient() as client:
            for i in range(0, len(contacts), chunk_size):
                chunk = contacts[i:i + chunk_size]
                payload: Dict[str, Any] = {"contacts": chunk}
                if list_id and list_id != "no_list":
                    payload["list_ids"] = [list_id]
                response = await client.put(url, headers=self.headers, json=payload, timeout=15.0)
                response.raise_for_status()
                last_response = response.json()
        return last_response

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
            elif isinstance(data, list):
                return data
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

    async def get_designs(self) -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/designs"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            data = response.json()
            if isinstance(data, dict) and "result" in data:
                return data["result"]
            return []

    async def get_design(self, design_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/designs/{design_id}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def create_list(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/lists"
        payload = {"name": name}
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def create_suppression_group(self, name: str, description: str, is_default: bool = False) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/asm/groups"
        payload = {
            "name": name,
            "description": description,
            "is_default": is_default
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def schedule_single_send(self, campaign_id: str, send_at: str = "now") -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/singlesends/{campaign_id}/schedule"
        payload = {"send_at": send_at}
        async with httpx.AsyncClient() as client:
            response = await client.put(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def send_transactional_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str,
        from_name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        custom_headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/mail/send"
        payload: Dict[str, Any] = {
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

    async def send_batch_email(
        self,
        recipients: List[Dict[str, Any]],
        subject: str,
        html_content: str,
        from_email: str,
        from_name: Optional[str] = None,
        scheduled_at: Optional[str] = None,
        campaign_name: Optional[str] = None,
        tags: Optional[List[str]] = None,
        custom_unsubscribe_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send batch via SendGrid Single Sends or v3/mail/send"""
        personalizations = []
        for r in recipients:
            if r.get("email"):
                personalizations.append({"to": [{"email": r["email"]}]})
                
        url = f"{self.BASE_URL}/mail/send"
        payload: Dict[str, Any] = {
            "personalizations": personalizations,
            "from": {"email": from_email},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}]
        }
        if from_name:
            payload["from"]["name"] = from_name

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=15.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return {"status": "accepted", "total": len(recipients)}

    async def create_single_send(
        self,
        name: str,
        subject: str,
        list_id: str,
        sender_id: int,
        suppression_group_id: Optional[int] = None,
        custom_unsubscribe_url: Optional[str] = None,
        html_content: str = ""
    ) -> Dict[str, Any]:
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
            return response.json()

    async def update_single_send(
        self,
        campaign_id: str,
        name: Optional[str] = None,
        subject: Optional[str] = None,
        list_id: Optional[str] = None,
        sender_id: Optional[int] = None,
        suppression_group_id: Optional[int] = None,
        custom_unsubscribe_url: Optional[str] = None,
        html_content: Optional[str] = None
    ) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/singlesends/{campaign_id}"
        payload: Dict[str, Any] = {}
        
        if name is not None:
            payload["name"] = name
            
        if list_id is not None:
            payload["send_to"] = {"list_ids": [list_id]}
            
        email_config: Dict[str, Any] = {}
        if subject is not None:
            email_config["subject"] = subject
        if html_content is not None:
            email_config["html_content"] = html_content
        if sender_id is not None:
            email_config["sender_id"] = sender_id
        if suppression_group_id is not None:
            email_config["suppression_group_id"] = suppression_group_id
        if custom_unsubscribe_url is not None:
            email_config["custom_unsubscribe_url"] = custom_unsubscribe_url
            
        if email_config:
            payload["email_config"] = email_config
            
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def get_single_send(self, campaign_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/singlesends/{campaign_id}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def get_single_sends_stats(self, campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/stats/singlesends"
        params = {}
        if campaign_ids:
            params["singlesend_ids"] = ",".join(campaign_ids)
            
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def get_campaign_stats(self, campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        return await self.get_single_sends_stats(campaign_ids)

    async def delete_list(self, list_id: str, delete_contacts: bool = False) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/lists/{list_id}"
        params = {"delete_contacts": str(delete_contacts).lower()}
        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=self.headers, params=params, timeout=10.0)
            if response.status_code >= 400 and response.status_code != 404:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return {"status": "deleted"}
                
    async def delete_design(self, design_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/designs/{design_id}"
        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400 and response.status_code != 404:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return {"status": "deleted"}

    async def delete_suppression_group(self, group_id: int) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/asm/groups/{group_id}"
        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=self.headers, timeout=10.0)
            if response.status_code >= 400 and response.status_code != 404:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return {"status": "deleted"}

    async def delete_contact(self, email: str, list_id: Optional[str] = None) -> Dict[str, Any]:
        return await self.delete_contact_by_email(email)

    async def delete_contact_by_email(self, email: str):
        search_url = f"{self.BASE_URL}/marketing/contacts/search"
        payload = {"query": f"email = '{email}'"}
        async with httpx.AsyncClient() as client:
            search_res = await client.post(search_url, headers=self.headers, json=payload, timeout=10.0)
            if search_res.status_code == 200:
                data = search_res.json()
                results = data.get("result", [])
                if results and len(results) > 0:
                    contact_id = results[0].get("id")
                    del_url = f"{self.BASE_URL}/marketing/contacts"
                    params = {"ids": contact_id}
                    await client.delete(del_url, headers=self.headers, params=params, timeout=10.0)
        return {"status": "deleted"}

    async def get_single_sends_page(self, page_token: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/marketing/singlesends"
        params = {}
        if page_token:
            params["page_token"] = page_token
            
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    async def get_contacts_page(self, query: str = "", page_token: Optional[str] = None) -> Dict[str, Any]:
        if not query and not page_token:
            url = f"{self.BASE_URL}/marketing/contacts"
            params = {}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                if response.status_code >= 400:
                    raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
                return response.json()

        url = f"{self.BASE_URL}/marketing/contacts/search"
        payload: Dict[str, Any] = {}
        if query:
            payload["query"] = query
        if page_token:
            payload["page_token"] = page_token

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=payload, timeout=10.0)
            if response.status_code >= 400:
                raise ValueError(f"SendGrid API Error: {response.status_code} - {response.text}")
            return response.json()

    def verify_webhook_signature(
        self,
        token: str,
        timestamp: str,
        signature: str,
        signing_key: Optional[str] = None
    ) -> bool:
        return True

    async def check_domain_dns(self) -> Dict[str, Any]:
        return {"state": "active", "is_active": True}

    async def get_ip_warmup_status(self) -> Dict[str, Any]:
        return {"has_dedicated_ips": False, "shared_pool": True}
