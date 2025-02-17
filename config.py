from datetime import datetime, timedelta
import os
import json
import random
import hashlib
import logging
import time
from typing import Dict, Optional
import pytz
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class SecurityConfig:
    def __init__(self):
        self._salt = os.urandom(16)
        self._key = self._generate_key()
        self._cipher_suite = Fernet(self._key)

    def _generate_key(self) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self._salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(os.urandom(32)))
        return key

    def encrypt(self, data: str) -> str:
        return self._cipher_suite.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        return self._cipher_suite.decrypt(encrypted_data.encode()).decode()


class Config:
    def __init__(self):
        self.security = SecurityConfig()
        self.load_token()
        self.load_proxies()
        self.setup_security()
        self.setup_logging()

    def load_token(self) -> None:
        try:
            with open("token.txt", "r") as f:
                self.BEARER_TOKEN = f.read().strip()
                if not self.BEARER_TOKEN:
                    raise ValueError("Token file is empty")
        except (FileNotFoundError, ValueError) as e:
            raise Exception(f"Token error: {str(e)}")

    def load_proxies(self) -> None:
        try:
            with open("proxies.txt", "r") as f:
                self.PROXIES = [line.strip() for line in f if line.strip()]
                if not self.PROXIES:
                    print("Warning: No proxies found in proxies.txt")
        except FileNotFoundError:
            self.PROXIES = []
            print("Warning: proxies.txt not found")

    def setup_security(self) -> None:
        self.API_ENDPOINTS = {
            "task": "https://agent.gata.xyz/api/task",
            "rewards": "https://agent.gata.xyz/api/task_rewards",
        }
        self.MAX_RETRIES = 3
        self.TIMEOUT = 30
        self.MAX_CONCURRENT_REQUESTS = 5
        self.RATE_LIMIT = {
            "limit": 10000,
            "remaining": 9994,
            "reset": int(time.time()) + 3600,
        }
        self.request_history = []

    def setup_logging(self) -> None:
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        log_format = "%(asctime)s - %(name)s - [%(levelname)s] - %(message)s"
        logging.basicConfig(
            level=logging.INFO,
            format=log_format,
            handlers=[
                logging.FileHandler(
                    f'{log_dir}/dva_bot_{datetime.now(pytz.UTC).strftime("%Y%m%d")}.log'
                ),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger("DVABot")

    def get_current_utc(self) -> datetime:
        """Get current UTC time"""
        return datetime.now(pytz.UTC)

    def get_current_utc_formatted(self, format="%Y-%m-%d %H:%M:%S") -> str:
        """Get formatted current UTC time"""
        return self.get_current_utc().strftime(format)

    def get_chrome_version(self) -> str:
        versions = ["132.0.0.0", "131.0.0.0", "130.0.0.0"]
        return random.choice(versions)

    def generate_request_id(self) -> str:
        timestamp = self.get_current_utc_formatted()
        random_str = os.urandom(8).hex()
        return hashlib.sha256(f"{timestamp}{random_str}".encode()).hexdigest()[:16]

    def get_headers(self) -> Dict[str, str]:
        chrome_version = self.get_chrome_version()
        request_id = self.generate_request_id()

        headers = {
            ":authority": "agent.gata.xyz",
            ":method": "PATCH",
            ":scheme": "https",
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "id,en-US;q=0.9,en;q=0.8",
            "authorization": f"Bearer {self.BEARER_TOKEN}",
            "content-type": "application/json",
            "origin": "https://app.gata.xyz",
            "referer": "https://app.gata.xyz/",
            "sec-ch-ua": f'"Not A(Brand";v="8", "Chromium";v="{chrome_version}", "Google Chrome";v="{chrome_version}"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36",
            "x-request-id": request_id,
        }
        return headers

    def get_random_proxy(self) -> Optional[str]:
        return random.choice(self.PROXIES) if self.PROXIES else None

    def log_request(self, request_data: Dict) -> None:
        self.request_history.append(
            {
                "timestamp": self.get_current_utc_formatted(),
                "request_id": request_data.get("request_id"),
                "endpoint": request_data.get("endpoint"),
                "status": request_data.get("status"),
            }
        )
