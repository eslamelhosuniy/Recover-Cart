from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseEmailProvider(ABC):
    """
    Abstract Base Class for all Email Providers (SendGrid, Mailgun, etc.)
    Ensures a consistent interface across the application for:
    - Transactional sending
    - Campaign / Batch sending
    - Contact list management
    - Template / Design management
    - Suppression & unsubscribe handling
    - Webhook event verification & parsing
    - Domain DNS & deliverability status
    - IP & Warmup management
    """

    @abstractmethod
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
        """Send a single transactional email"""
        pass

    @abstractmethod
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
        """Send a batch / broadcast email to multiple recipients"""
        pass

    @abstractmethod
    async def get_lists(self) -> List[Dict[str, Any]]:
        """Retrieve all mailing lists"""
        pass

    @abstractmethod
    async def create_list(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Create a new mailing list"""
        pass

    @abstractmethod
    async def delete_list(self, list_id: str, delete_contacts: bool = False) -> Dict[str, Any]:
        """Delete a mailing list"""
        pass

    @abstractmethod
    async def add_or_update_contacts(
        self,
        list_id: Optional[str],
        contacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Add or update contacts in a mailing list"""
        pass

    @abstractmethod
    async def delete_contact(self, email: str, list_id: Optional[str] = None) -> Dict[str, Any]:
        """Delete a contact by email"""
        pass

    @abstractmethod
    async def get_senders(self) -> List[Dict[str, Any]]:
        """Retrieve verified senders or domain sending identity"""
        pass

    @abstractmethod
    async def get_suppression_groups(self) -> List[Dict[str, Any]]:
        """Retrieve suppression groups / unsubscribes"""
        pass

    @abstractmethod
    async def get_designs(self) -> List[Dict[str, Any]]:
        """Retrieve saved templates / designs"""
        pass

    @abstractmethod
    async def get_design(self, design_id: str) -> Dict[str, Any]:
        """Retrieve a specific template / design by ID or name"""
        pass

    @abstractmethod
    async def delete_design(self, design_id: str) -> Dict[str, Any]:
        """Delete a template / design"""
        pass

    @abstractmethod
    async def get_campaign_stats(self, campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Retrieve delivery and engagement statistics for campaigns"""
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        token: str,
        timestamp: str,
        signature: str,
        signing_key: Optional[str] = None
    ) -> bool:
        """Verify the authenticity of an incoming webhook event"""
        pass

    @abstractmethod
    async def check_domain_dns(self) -> Dict[str, Any]:
        """Check domain DNS records and deliverability verification status"""
        pass

    @abstractmethod
    async def get_ip_warmup_status(self) -> Dict[str, Any]:
        """Retrieve dedicated IP warmup status and stages"""
        pass
