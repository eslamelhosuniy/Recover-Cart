import logging
from typing import Optional, Any
from app.services.email_providers.base import BaseEmailProvider
from app.services.email_providers.mailgun_client import MailgunClient
from app.services.email_providers.sendgrid_client import SendGridClient

logger = logging.getLogger(__name__)


class EmailProviderFactory:
    """
    Factory to instantiate the appropriate Email Provider client (Mailgun or SendGrid)
    based on the store's email settings.
    """

    @staticmethod
    def get_provider(settings: Any) -> BaseEmailProvider:
        """
        Instantiate and return the configured email provider for the given EmailSetting instance.
        """
        if not settings:
            raise ValueError("Email settings are not configured for this store.")

        provider = getattr(settings, "provider", None) or "mailgun"
        provider = str(provider).lower().strip()

        # Check Mailgun
        if provider == "mailgun" or (getattr(settings, "mailgun_api_key", None) and getattr(settings, "mailgun_domain", None) and not getattr(settings, "sendgrid_api_key", None)):
            api_key = getattr(settings, "mailgun_api_key", None)
            domain = getattr(settings, "mailgun_domain", None)
            region = getattr(settings, "mailgun_region", "us")
            signing_key = getattr(settings, "mailgun_webhook_signing_key", None)

            if not api_key or not domain:
                raise ValueError("Store is configured to use Mailgun, but Mailgun API Key or Sending Domain is missing.")

            return MailgunClient(
                api_key=api_key,
                domain=domain,
                region=region or "us",
                webhook_signing_key=signing_key
            )

        # Check SendGrid
        elif provider == "sendgrid" or getattr(settings, "sendgrid_api_key", None):
            api_key = getattr(settings, "sendgrid_api_key", None)
            if not api_key:
                raise ValueError("Store is configured to use SendGrid, but SendGrid API Key is missing.")
            return SendGridClient(api_key=api_key)

        else:
            raise ValueError("No valid email provider (Mailgun or SendGrid) is configured for this store.")
