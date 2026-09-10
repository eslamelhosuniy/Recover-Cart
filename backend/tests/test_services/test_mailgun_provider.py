import pytest
import os
import hmac
import hashlib
from app.services.email_providers.mailgun_client import MailgunClient
from app.services.email_providers.factory import EmailProviderFactory
from app.schemas.email_schemas import EmailSettingCreate


def test_mailgun_webhook_signature_verification():
    signing_key = "test_webhook_signing_key_secret_123"
    client = MailgunClient(
        api_key="test-api-key",
        domain="mail.example.com",
        webhook_signing_key=signing_key
    )

    timestamp = "1725969600"
    token = "a8501e23e80b060ce9f2978e3b99b0d4f0402d330b3f6b725b"
    
    # Generate valid signature
    message = f"{timestamp}{token}".encode("utf-8")
    valid_signature = hmac.new(
        key=signing_key.encode("utf-8"),
        msg=message,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Verify valid signature returns True
    assert client.verify_webhook_signature(token, timestamp, valid_signature) is True

    # Verify tampered signature returns False
    invalid_signature = valid_signature[:-4] + "ffff"
    assert client.verify_webhook_signature(token, timestamp, invalid_signature) is False


def test_email_provider_factory():
    # Test Mailgun instantiation
    mailgun_settings = EmailSettingCreate(
        provider="mailgun",
        mailgun_api_key="mock_mailgun_key_for_testing",
        mailgun_domain="mail.example.com",
        mailgun_region="us",
        mailgun_webhook_signing_key="mock_signing_key"
    )
    provider = EmailProviderFactory.get_provider(mailgun_settings)
    assert isinstance(provider, MailgunClient)
    assert provider.domain == "mail.example.com"
    assert provider.region == "us"

    # Test SendGrid instantiation
    sendgrid_settings = EmailSettingCreate(
        provider="sendgrid",
        sendgrid_api_key="SG.test_key_123"
    )
    sg_provider = EmailProviderFactory.get_provider(sendgrid_settings)
    assert sg_provider.api_key == "SG.test_key_123"


@pytest.mark.asyncio
async def test_mailgun_live_api_check():
    """Test live connectivity with Mailgun if credentials are provided in env"""
    api_key = os.environ.get("MAILGUN_API_KEY")
    domain = os.environ.get("MAILGUN_DOMAIN", "mail.wedadmarketing.com")
    signing_key = os.environ.get("MAILGUN_WEBHOOK_SIGNING_KEY", "mock_signing_key")
    
    if not api_key:
        pytest.skip("MAILGUN_API_KEY environment variable not set, skipping live API test")

    client = MailgunClient(
        api_key=api_key,
        domain=domain,
        webhook_signing_key=signing_key
    )
    
    # 1. Check domain DNS
    domain_status = await client.check_domain_dns()
    assert "domain" in domain_status

    # 2. Check IP warmup status
    ip_status = await client.get_ip_warmup_status()
    assert "has_dedicated_ips" in ip_status

