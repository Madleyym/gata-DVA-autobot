from datetime import datetime
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
        """Encrypt string data - this is used by DVABot for task validation"""
        return self._cipher_suite.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt encrypted string data"""
        return self._cipher_suite.decrypt(encrypted_data.encode()).decode()


class Config:
    def __init__(self):
        # Inisialisasi keamanan
        self.security = SecurityConfig()

        # Load konfigurasi dasar
        self.load_token()
        self.load_proxies()
        self.setup_security()
        self.setup_logging()

        # Inisialisasi riwayat permintaan
        self.request_history = []

        # Status rate limiting
        self.RATE_LIMIT = {
            "limit": 10000,
            "remaining": 9997,
            "reset": int(time.time()) + 3600,
        }

    def load_token(self) -> None:
        """Load token dari file token.txt"""
        try:
            with open("token.txt", "r") as f:
                token = f.read().strip()
                if not token:
                    raise ValueError("Token file is empty")
                self.BEARER_TOKEN = token
        except (FileNotFoundError, ValueError) as e:
            raise Exception(f"Token error: {str(e)}")

    def load_proxies(self) -> None:
        """Load proxy dari file proxies.txt"""
        try:
            with open("proxies.txt", "r") as f:
                self.PROXIES = [line.strip() for line in f if line.strip()]
                if not self.PROXIES:
                    print("Warning: No proxies found in proxies.txt")
        except FileNotFoundError:
            self.PROXIES = []
            print("Warning: proxies.txt not found")

    def setup_security(self) -> None:
        """Setup endpoint API dan parameter keamanan"""
        self.API_ENDPOINTS = {
            "task": "https://agent.gata.xyz/api/task",
            "task_rewards": "https://agent.gata.xyz/api/task_rewards",
            "my_intelligence": "https://agent.gata.xyz/api/my_intelligence",
            "conversation": "https://agent.gata.xyz/api/conversation",
        }

        # Konfigurasi request
        self.MAX_RETRIES = 3
        self.TIMEOUT = 30
        self.MAX_CONCURRENT_REQUESTS = 5

    def setup_logging(self) -> None:
        """Setup logging ke file dan console"""
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
        """Get waktu UTC saat ini"""
        return datetime.now(pytz.UTC)

    def get_current_utc_formatted(self, format="%Y-%m-%d %H:%M:%S") -> str:
        """Get waktu UTC saat ini dalam format string"""
        return self.get_current_utc().strftime(format)

    def get_chrome_version(self) -> str:
        """Generate random Chrome version untuk User-Agent"""
        versions = ["133.0.0.0", "132.0.0.0", "131.0.0.0"]
        return random.choice(versions)

    def generate_request_id(self) -> str:
        """Generate unique request ID"""
        timestamp = self.get_current_utc_formatted()
        random_str = os.urandom(8).hex()
        return hashlib.sha256(f"{timestamp}{random_str}".encode()).hexdigest()[:16]

    def get_headers(self, client_type: str = "agent") -> Dict[str, str]:
        """Get headers untuk request API"""
        base_headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "origin": "https://app.gata.xyz",
            "referer": "https://app.gata.xyz/",
            "authority": "agent.gata.xyz",
            "user-agent": f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{self.get_chrome_version()} Safari/537.36",
        }

        if client_type == "agent":
            base_headers.update(
                {
                    "authorization": f"Bearer {self.BEARER_TOKEN}",
                    "x-gata-endpoint": "pc-browser",
                    "x-gata-request-id": self.generate_request_id(),
                    "x-gata-timestamp": str(int(time.time())),
                }
            )

        return base_headers

    def get_random_proxy(self) -> Optional[str]:
        """Get random proxy dari daftar proxy"""
        return random.choice(self.PROXIES) if self.PROXIES else None

    def log_request(self, request_data: Dict) -> None:
        """Log data request ke riwayat"""
        self.request_history.append(
            {
                "timestamp": self.get_current_utc_formatted(),
                "request_id": request_data.get("request_id"),
                "endpoint": request_data.get("endpoint"),
                "status": request_data.get("status"),
            }
        )

    def save_request_history(self) -> None:
        """Simpan riwayat request ke file JSON"""
        try:
            with open("request_history.json", "w") as f:
                json.dump(self.request_history, f, indent=2)
        except Exception as e:
            print(f"Failed to save request history: {str(e)}")
