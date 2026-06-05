import re
import os
import logging
import asyncio
import smtplib
from typing import Optional, Tuple, Dict, List
import dns.resolver
import dns.exception

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

class EmailValidationService:
    def __init__(self):
        self.disposable_domains = set()
        self._mx_cache = {}
        self._load_disposable_domains()

    def _load_disposable_domains(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "disposable_domains.txt")
        path = os.path.normpath(path)
        if not os.path.exists(path):
            logger.warning(f"Disposable domain blocklist not found at '{path}'.")
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip().lower()
                    if line and not line.startswith("#"):
                        self.disposable_domains.add(line)
            logger.info(f"Loaded {len(self.disposable_domains)} disposable domains.")
        except Exception as e:
            logger.error(f"Failed to load disposable domains: {e}")

    def validate_syntax(self, email: str) -> bool:
        return bool(EMAIL_REGEX.match(email))

    def is_disposable(self, email: str) -> bool:
        if "@" not in email:
            return False
        domain = email.split("@", 1)[1].lower()
        return domain in self.disposable_domains

    def _check_mx_sync(self, domain: str, timeout: int = 3) -> Tuple[bool, Optional[str], Optional[str]]:
        if domain in self._mx_cache:
            return self._mx_cache[domain]

        result = (False, None, "No MX records")
        try:
            resolver = dns.resolver.Resolver()
            resolver.lifetime = timeout
            resolver.timeout = timeout
            answers = resolver.resolve(domain, "MX")
            mx_records = sorted(answers, key=lambda r: r.preference)
            mx_host = str(mx_records[0].exchange).rstrip(".")
            result = (True, mx_host, None)
        except dns.resolver.NXDOMAIN:
            result = (False, None, "NXDOMAIN - Domain does not exist")
        except dns.resolver.NoAnswer:
            result = (False, None, "NoAnswer - No MX records found")
        except dns.resolver.NoNameservers:
            result = (False, None, "NoNameservers - DNS error")
        except dns.exception.Timeout:
            result = (False, None, "DNS Timeout")
        except Exception as e:
            result = (False, None, f"DNS Error: {str(e)}")

        self._mx_cache[domain] = result
        return result

    async def check_mx(self, domain: str) -> Tuple[bool, Optional[str], Optional[str]]:
        return await asyncio.to_thread(self._check_mx_sync, domain)

    def _check_smtp_sync(self, email: str, mx_host: str, timeout: int = 5) -> Optional[bool]:
        domain = email.split("@", 1)[1]
        try:
            with smtplib.SMTP(timeout=timeout) as smtp:
                smtp.connect(mx_host)
                smtp.helo(domain)
                smtp.mail("test@example.com")
                code, msg = smtp.rcpt(email)
                if code in (250, 251):
                    return True
                elif code >= 500:
                    return False
                return None
        except Exception as e:
            logger.debug(f"SMTP check failed for {email} on {mx_host}: {e}")
            return None

    async def check_smtp(self, email: str, mx_host: str) -> Optional[bool]:
        return await asyncio.to_thread(self._check_smtp_sync, email, mx_host)

    async def validate_email(self, email: str, use_smtp: bool = False, check_mx_flag: bool = True, check_spelling: bool = True) -> Dict:
        """
        Returns a dictionary with validation results:
        {
            "status": "valid" | "risky" | "invalid",
            "reason": str,
            "has_mx": bool,
            "mx_host": str,
            "smtp_valid": bool
        }
        """
        email = email.lower().strip()
        result = {
            "status": "pending",
            "reason": None,
            "has_mx": False,
            "mx_host": None,
            "smtp_valid": None
        }

        if check_spelling:
            if not self.validate_syntax(email):
                result["status"] = "invalid"
                result["reason"] = "Invalid syntax"
                return result

            if self.is_disposable(email):
                result["status"] = "invalid"
                result["reason"] = "Disposable email domain"
                return result

        domain = email.split("@", 1)[1] if "@" in email else None
        if not domain:
            result["status"] = "invalid"
            result["reason"] = "No domain found"
            return result
        
        if not check_mx_flag:
            result["status"] = "valid"
            result["reason"] = "MX check disabled"
            return result

        has_mx, mx_host, mx_error = await self.check_mx(domain)
        result["has_mx"] = has_mx
        result["mx_host"] = mx_host

        if not has_mx:
            if "Timeout" in str(mx_error):
                result["status"] = "risky"
                result["reason"] = "DNS Timeout"
            else:
                result["status"] = "invalid"
                result["reason"] = mx_error or "No MX records"
            return result

        if use_smtp and mx_host:
            smtp_valid = await self.check_smtp(email, mx_host)
            result["smtp_valid"] = smtp_valid
            if smtp_valid is True:
                result["status"] = "valid"
                result["reason"] = "Passed SMTP check"
            elif smtp_valid is False:
                result["status"] = "invalid"
                result["reason"] = "SMTP rejected mailbox"
            else:
                result["status"] = "risky"
                result["reason"] = "SMTP check inconclusive"
            return result

        # If has MX and no SMTP check requested
        result["status"] = "valid"
        result["reason"] = "Valid MX records"
        return result

email_validation_service = EmailValidationService()
