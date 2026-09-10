import httpx
import logging
import hmac
import hashlib
import json
from typing import Dict, Any, List, Optional
from app.services.email_providers.base import BaseEmailProvider

logger = logging.getLogger(__name__)


class MailgunClient(BaseEmailProvider):
    """
    Mailgun Email Provider Client implementing BaseEmailProvider.
    Uses official Mailgun v3 API (Messages, Mailing Lists, Templates, Suppressions, Domains, IP Warmup, Webhooks).
    """

    US_BASE_URL = "https://api.mailgun.net/v3"
    EU_BASE_URL = "https://api.eu.mailgun.net/v3"

    def __init__(
        self,
        api_key: str,
        domain: str,
        region: str = "us",
        webhook_signing_key: Optional[str] = None
    ):
        self.api_key = api_key.strip() if api_key else ""
        self.domain = domain.strip().lower() if domain else ""
        self.region = (region or "us").strip().lower()
        self.webhook_signing_key = (webhook_signing_key or "").strip()
        
        self.base_url = self.EU_BASE_URL if self.region == "eu" else self.US_BASE_URL
        self.auth = httpx.BasicAuth("api", self.api_key)

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        timeout: float = 15.0
    ) -> Dict[str, Any]:
        """Helper method for making authenticated requests to Mailgun API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    auth=self.auth,
                    data=data,
                    params=params,
                    json=json_body,
                    timeout=timeout
                )
                
                if response.status_code >= 400:
                    error_msg = f"Mailgun API Error {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    raise ValueError(error_msg)
                    
                if response.status_code == 204 or not response.content:
                    return {"status": "success"}
                    
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"HTTP error during Mailgun API call to {url}: {e}")
                raise ValueError(f"Mailgun connection error: {str(e)}")

    # -------------------------------------------------------------------------
    # 1. Messages / Sending (Transactional & Batch)
    # -------------------------------------------------------------------------

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
        """
        Send a single transactional email via POST /v3/{domain}/messages
        """
        sender_formatted = f"{from_name} <{from_email}>" if from_name else from_email
        
        form_data = {
            "from": sender_formatted,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "o:tracking": "yes",
            "o:tracking-clicks": "yes",
            "o:tracking-opens": "yes",
        }
        
        if tags:
            form_data["o:tag"] = tags

        if custom_headers:
            for k, v in custom_headers.items():
                form_data[f"h:{k}"] = v

        endpoint = f"{self.domain}/messages"
        res = await self._request("POST", endpoint, data=form_data)
        
        msg_id = res.get("id", "unknown")
        # Clean <message-id> brackets if present
        clean_msg_id = msg_id.strip("<>")
        return {
            "status": "accepted",
            "message_id": clean_msg_id,
            "raw": res
        }

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
        """
        Send a batch / broadcast email to multiple recipients with recipient variables.
        Mailgun supports up to 1,000 recipients per batch request with personalized recipient variables.
        """
        if not recipients:
            raise ValueError("Recipients list cannot be empty")

        sender_formatted = f"{from_name} <{from_email}>" if from_name else from_email
        chunk_size = 1000
        batch_results = []

        for i in range(0, len(recipients), chunk_size):
            chunk = recipients[i:i + chunk_size]
            
            to_emails = []
            recipient_vars = {}

            for r in chunk:
                email = r.get("email")
                if not email:
                    continue
                to_emails.append(email)
                recipient_vars[email] = {
                    "first_name": r.get("first_name", ""),
                    "last_name": r.get("last_name", ""),
                    "id": str(r.get("id", ""))
                }

            if not to_emails:
                continue

            form_data = {
                "from": sender_formatted,
                "to": to_emails,
                "subject": subject,
                "html": html_content,
                "recipient-variables": json.dumps(recipient_vars),
                "o:tracking": "yes",
                "o:tracking-clicks": "yes",
                "o:tracking-opens": "yes",
            }

            if tags:
                form_data["o:tag"] = tags

            if campaign_name:
                form_data["v:campaign_name"] = campaign_name

            if scheduled_at:
                # Mailgun RFC 2822 / date format for o:deliverytime
                form_data["o:deliverytime"] = scheduled_at

            if custom_unsubscribe_url:
                form_data["h:List-Unsubscribe"] = f"<{custom_unsubscribe_url}>"

            endpoint = f"{self.domain}/messages"
            res = await self._request("POST", endpoint, data=form_data)
            batch_results.append(res)

        return {
            "status": "accepted",
            "batches_sent": len(batch_results),
            "total_recipients": len(recipients),
            "results": batch_results
        }

    # -------------------------------------------------------------------------
    # 2. Mailing Lists & Members
    # -------------------------------------------------------------------------

    async def get_lists(self) -> List[Dict[str, Any]]:
        """
        Retrieve all mailing lists via GET /v3/lists/pages
        """
        res = await self._request("GET", "lists/pages")
        items = res.get("items", [])
        
        # Normalize format for application consumers
        formatted = []
        for item in items:
            formatted.append({
                "id": item.get("address"),
                "name": item.get("name") or item.get("address"),
                "address": item.get("address"),
                "contact_count": item.get("members_count", 0),
                "description": item.get("description", "")
            })
        return formatted

    async def create_list(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new mailing list via POST /v3/lists
        """
        # Ensure address format is listname@domain
        sanitized_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in name.lower()).strip("-")
        list_address = f"{sanitized_name}@{self.domain}" if "@" not in name else name

        form_data = {
            "address": list_address,
            "name": name,
            "description": description or f"Mailing list for {name}",
            "access_level": "readonly"
        }
        res = await self._request("POST", "lists", data=form_data)
        list_obj = res.get("list", {})
        
        return {
            "id": list_obj.get("address", list_address),
            "name": list_obj.get("name", name),
            "address": list_obj.get("address", list_address),
            "contact_count": 0
        }

    async def delete_list(self, list_id: str, delete_contacts: bool = False) -> Dict[str, Any]:
        """
        Delete a mailing list via DELETE /v3/lists/{address}
        """
        address = list_id if "@" in list_id else f"{list_id}@{self.domain}"
        return await self._request("DELETE", f"lists/{address}")

    async def add_or_update_contacts(
        self,
        list_id: Optional[str],
        contacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Add or update contacts into a list via POST /v3/lists/{address}/members.json (Bulk upload)
        """
        if not list_id or list_id == "no_list":
            # If no list is specified, nothing to push to Mailgun lists directly
            return {"status": "skipped", "message": "No list specified"}

        address = list_id if "@" in list_id else f"{list_id}@{self.domain}"
        endpoint = f"lists/{address}/members.json"

        chunk_size = 1000
        last_response = {}

        for i in range(0, len(contacts), chunk_size):
            chunk = contacts[i:i + chunk_size]
            members = []
            
            for c in chunk:
                email = c.get("email")
                if not email:
                    continue
                first_name = c.get("first_name", "")
                last_name = c.get("last_name", "")
                full_name = f"{first_name} {last_name}".strip()
                
                members.append({
                    "address": email,
                    "name": full_name or None,
                    "vars": {"first_name": first_name, "last_name": last_name},
                    "subscribed": True,
                    "upsert": "yes"
                })

            if not members:
                continue

            form_data = {
                "members": json.dumps(members),
                "upsert": "true"
            }
            last_response = await self._request("POST", endpoint, data=form_data)

        return last_response

    async def delete_contact(self, email: str, list_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Delete a contact from a list via DELETE /v3/lists/{address}/members/{member_address}
        """
        if list_id:
            address = list_id if "@" in list_id else f"{list_id}@{self.domain}"
            return await self._request("DELETE", f"lists/{address}/members/{email}")
        return {"status": "ok"}

    # -------------------------------------------------------------------------
    # 3. Senders & Domains
    # -------------------------------------------------------------------------

    async def get_senders(self) -> List[Dict[str, Any]]:
        """
        Retrieve senders / verified domain identities
        """
        domain_info = await self.check_domain_dns()
        domain_name = domain_info.get("domain", self.domain)
        is_active = domain_info.get("state") == "active"
        
        return [{
            "id": 1,
            "nickname": f"Mailgun ({domain_name})",
            "from": {
                "email": f"noreply@{domain_name}",
                "name": domain_name
            },
            "is_active": is_active,
            "domain": domain_name
        }]

    async def check_domain_dns(self) -> Dict[str, Any]:
        """
        Check domain DNS records (SPF, DKIM, MX, CNAME) and verification state via GET /v3/domains/{domain}
        """
        try:
            res = await self._request("GET", f"domains/{self.domain}")
            domain_data = res.get("domain", {})
            inbound_dns = res.get("receiving_dns_records", [])
            outbound_dns = res.get("sending_dns_records", [])
            
            # Analyze SPF, DKIM, MX, CNAME status
            spf_valid = False
            dkim_valid = False
            mx_valid = False
            cname_valid = False
            
            for rec in outbound_dns:
                rec_type = rec.get("record_type", "").upper()
                rec_valid = rec.get("valid", "unknown") == "valid"
                if rec_type == "TXT":
                    if "v=spf1" in rec.get("value", ""):
                        spf_valid = rec_valid
                    elif "k=rsa" in rec.get("value", "") or "mailo._domainkey" in rec.get("name", ""):
                        dkim_valid = rec_valid
                elif rec_type == "CNAME":
                    cname_valid = rec_valid

            for rec in inbound_dns:
                if rec.get("record_type", "").upper() == "MX":
                    if rec.get("valid") == "valid":
                        mx_valid = True

            state = domain_data.get("state", "unverified")
            
            return {
                "domain": self.domain,
                "state": state,
                "is_active": state == "active",
                "spf_valid": spf_valid,
                "dkim_valid": dkim_valid,
                "mx_valid": mx_valid,
                "cname_valid": cname_valid,
                "sending_dns_records": outbound_dns,
                "receiving_dns_records": inbound_dns,
                "created_at": domain_data.get("created_at")
            }
        except Exception as e:
            logger.error(f"Error checking domain DNS for {self.domain}: {e}")
            return {
                "domain": self.domain,
                "state": "error",
                "is_active": False,
                "error": str(e)
            }

    async def verify_domain(self) -> Dict[str, Any]:
        """
        Trigger Mailgun to re-check DNS records via PUT /v3/domains/{domain}/verify
        """
        return await self._request("PUT", f"domains/{self.domain}/verify")

    # -------------------------------------------------------------------------
    # 4. Templates / Designs
    # -------------------------------------------------------------------------

    async def get_designs(self) -> List[Dict[str, Any]]:
        """
        Retrieve saved templates via GET /v3/{domain}/templates
        """
        res = await self._request("GET", f"{self.domain}/templates")
        items = res.get("items", [])
        
        formatted = []
        for item in items:
            formatted.append({
                "id": item.get("name"),
                "name": item.get("name"),
                "description": item.get("description", ""),
                "created_at": item.get("createdAt"),
                "updated_at": item.get("updatedAt")
            })
        return formatted

    async def get_design(self, design_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific template with its active version content
        """
        res = await self._request("GET", f"{self.domain}/templates/{design_id}", params={"active": "yes"})
        template = res.get("template", {})
        version = template.get("version", {})
        
        return {
            "id": template.get("name"),
            "name": template.get("name"),
            "description": template.get("description", ""),
            "html_content": version.get("template", ""),
            "subject": version.get("subject", "")
        }

    async def delete_design(self, design_id: str) -> Dict[str, Any]:
        """
        Delete a template via DELETE /v3/{domain}/templates/{name}
        """
        return await self._request("DELETE", f"{self.domain}/templates/{design_id}")

    # -------------------------------------------------------------------------
    # 5. Suppressions (Unsubscribes, Bounces, Complaints)
    # -------------------------------------------------------------------------

    async def get_suppression_groups(self) -> List[Dict[str, Any]]:
        """
        Retrieve suppression categories from Mailgun
        """
        return [
            {"id": 1, "name": "Unsubscribes", "description": "Users who opted out of emails", "is_default": True},
            {"id": 2, "name": "Bounces", "description": "Addresses that bounced permanently", "is_default": False},
            {"id": 3, "name": "Spam Complaints", "description": "Recipients who marked email as spam", "is_default": False}
        ]

    # -------------------------------------------------------------------------
    # 6. Stats & Campaign Analytics
    # -------------------------------------------------------------------------

    async def get_campaign_stats(self, campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Retrieve aggregate delivery & engagement stats via GET /v3/{domain}/stats/total
        """
        params = {
            "event": ["accepted", "delivered", "opened", "clicked", "unsubscribed", "complained", "failed"]
        }
        res = await self._request("GET", f"{self.domain}/stats/total", params=params)
        stats = res.get("stats", [])
        
        totals = {
            "sent": 0,
            "delivered": 0,
            "opened": 0,
            "clicked": 0,
            "unsubscribed": 0,
            "complained": 0,
            "bounced": 0
        }
        
        for item in stats:
            totals["sent"] += item.get("accepted", {}).get("total", 0)
            totals["delivered"] += item.get("delivered", {}).get("total", 0)
            totals["opened"] += item.get("opened", {}).get("total", 0)
            totals["clicked"] += item.get("clicked", {}).get("total", 0)
            totals["unsubscribed"] += item.get("unsubscribed", {}).get("total", 0)
            totals["complained"] += item.get("complained", {}).get("total", 0)
            totals["bounced"] += item.get("failed", {}).get("permanent", {}).get("total", 0)
            
        return {"results": [totals]}

    # -------------------------------------------------------------------------
    # 7. Dedicated IP & Warmup Management
    # -------------------------------------------------------------------------

    async def get_ip_warmup_status(self) -> Dict[str, Any]:
        """
        Retrieve Dedicated IP warmup status and stages via GET /v3/ips
        """
        try:
            res = await self._request("GET", "ips")
            ips = res.get("items", [])
            ip_details = []
            
            for ip_address in ips:
                try:
                    ip_info = await self._request("GET", f"ips/{ip_address}")
                    ip_details.append(ip_info)
                except Exception:
                    ip_details.append({"ip": ip_address, "dedicated": True})

            return {
                "has_dedicated_ips": len(ips) > 0,
                "ips_count": len(ips),
                "ips": ip_details,
                "shared_pool": len(ips) == 0,
                "warmup_available": len(ips) > 0
            }
        except Exception as e:
            logger.warning(f"Could not fetch dedicated IP warmup info: {e}")
            return {
                "has_dedicated_ips": False,
                "ips_count": 0,
                "ips": [],
                "shared_pool": True,
                "warmup_available": False,
                "note": "Store is using Mailgun shared IP pool or standard plan"
            }

    async def toggle_ip_warmup(self, ip_address: str, enable: bool = True) -> Dict[str, Any]:
        """
        Enable or disable automated IP warmup on a dedicated IP via POST/DELETE /v3/ips/{ip}/warmup
        """
        method = "POST" if enable else "DELETE"
        return await self._request(method, f"ips/{ip_address}/warmup")

    # -------------------------------------------------------------------------
    # 8. Webhook Signature Verification (HMAC-SHA256)
    # -------------------------------------------------------------------------

    def verify_webhook_signature(
        self,
        token: str,
        timestamp: str,
        signature: str,
        signing_key: Optional[str] = None
    ) -> bool:
        """
        Verifies Mailgun webhook authenticity using HMAC-SHA256:
        HMAC(timestamp + token, signing_key or api_key)
        """
        key = (signing_key or self.webhook_signing_key or self.api_key).strip()
        if not key or not token or not timestamp or not signature:
            return False

        message = f"{timestamp}{token}".encode("utf-8")
        secret = key.encode("utf-8")
        
        computed_signature = hmac.new(
            key=secret,
            msg=message,
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(computed_signature, signature)

    # -------------------------------------------------------------------------
    # 9. Email Validation (v4 Address Validation)
    # -------------------------------------------------------------------------

    async def validate_email(self, email: str) -> Dict[str, Any]:
        """
        Validate an email address via Mailgun's v4 Address Validation API
        """
        url = f"https://api.mailgun.net/v4/address/validate"
        if self.region == "eu":
            url = f"https://api.eu.mailgun.net/v4/address/validate"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    auth=self.auth,
                    params={"address": email},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    result = data.get("result", "unknown")  # deliverable, undeliverable, risky, unknown
                    return {
                        "is_valid": result == "deliverable",
                        "status": result,
                        "risk": data.get("risk", "unknown"),
                        "reason": data.get("reason", []),
                        "is_disposable": data.get("is_disposable_address", False),
                        "is_role_address": data.get("is_role_address", False)
                    }
                return {"is_valid": False, "status": "unknown"}
            except Exception as e:
                logger.error(f"Error validating email {email} via Mailgun: {e}")
                return {"is_valid": False, "status": "error", "error": str(e)}
