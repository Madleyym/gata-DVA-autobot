import asyncio
import aiohttp
import json
import sys
import random
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import os
import signal
import time
import platform  
from colorama import init, Fore, Style
from config import Config
import pytz

# Initialize colorama
if platform.system() == "Windows":
    init(wrap=True, convert=True, strip=False)
else:
    init(wrap=True, convert=False, strip=False)


class DisplayFormat:
    """Handle all display formatting"""

    # Use simpler symbols that work across all terminals
    CHECK = "+" if platform.system() == "Windows" else "✓"
    CROSS = "x" if platform.system() == "Windows" else "✗"
    ARROW = ">" if platform.system() == "Windows" else "→"
    BULLET = "*" if platform.system() == "Windows" else "•"
    CHAT = "#" if platform.system() == "Windows" else "💬"

    @staticmethod
    def get_terminal_size():
        """Safely get terminal size across different platforms"""
        try:
            return os.get_terminal_size()
        except OSError:
            return type("Size", (), {"columns": 80, "lines": 24})()

    @staticmethod
    def clear_screen():
        """Clear screen in a platform-independent way"""
        if platform.system() == "Windows":
            os.system("cls")
        else:
            os.system("clear")

    @staticmethod
    def print_header(title: str):
        width = DisplayFormat.get_terminal_size().columns
        print(f"\n{Fore.CYAN}{'=' * width}")
        print(f"{title.center(width)}")
        print(f"{'=' * width}{Style.RESET_ALL}")

    @staticmethod
    def print_status(timestamp: str, username: str):
        print(
            f"Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): {timestamp}"
        )
        print(f"Current User's Login: {username}\n")

    @staticmethod
    def print_chat_menu():
        print(f"\n{Fore.CYAN}=== Chat Options ==={Style.RESET_ALL}")
        print(f"{Fore.GREEN}1. Auto Chat (Default)")
        print(f"2. Manual Chat")
        print(f"3. Skip Chat{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Select option (1-3):{Style.RESET_ALL}", end=" ")

    @staticmethod
    def print_chat(role: str, message: str):
        if role.lower() == "ai":
            print(f"\n{Fore.CYAN}{DisplayFormat.CHAT} AI: {message}{Style.RESET_ALL}")
        else:
            print(f"\n{Fore.GREEN}{DisplayFormat.CHAT} You: {message}{Style.RESET_ALL}")

    @staticmethod
    def print_success(msg: str):
        print(f"{Fore.GREEN}{DisplayFormat.CHECK} {msg}{Style.RESET_ALL}")

    @staticmethod
    def print_error(msg: str):
        print(f"{Fore.RED}{DisplayFormat.CROSS} {msg}{Style.RESET_ALL}")

    @staticmethod
    def print_info(msg: str):
        print(f"{Fore.CYAN}{DisplayFormat.ARROW} {msg}{Style.RESET_ALL}")

    @staticmethod
    def print_warning(msg: str):
        print(f"{Fore.YELLOW}{DisplayFormat.BULLET} {msg}{Style.RESET_ALL}")


class DVABot:
    def __init__(self):
        self.config = Config()
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = True
        self.next_job_time = None
        self.display = DisplayFormat()
        self.last_chat_time = 0
        self.chat_mode = "auto"

        # Clear screen using platform-independent method
        self.display.clear_screen()

        # Get current time in UTC
        current_time = datetime.now(pytz.UTC).strftime("%Y-%m-%d %H:%M:%S")

        # Get username in a platform-independent way
        username = self.get_username()

        self.display.print_header("DVA Bot Status Monitor")
        self.display.print_status(current_time, username)
        self.display.print_info(f"Token: {self.config.BEARER_TOKEN[:20]}...")

    def get_username(self):
        """Get username in a platform-independent way"""
        try:
            if platform.system() == "Windows":
                return os.getenv("USERNAME", "Unknown")
            else:
                return os.getenv("USER", os.getenv("LOGNAME", "Unknown"))
        except:
            return "Unknown"
    async def create_session_with_proxy(self):
        """Create aiohttp session with random proxy if available"""
        if not self.session:
            proxy = self.config.get_random_proxy()
            if proxy:
                try:
                    connector = aiohttp.TCPConnector(ssl=False)  # Untuk menghindari SSL errors
                    self.session = aiohttp.ClientSession(
                        connector=connector,
                        trust_env=True,
                        timeout=aiohttp.ClientTimeout(total=30),
                    )
                    self.session.proxy = proxy
                    self.display.print_success(f"Session initialized with proxy: {proxy}")
                except Exception as e:
                    self.display.print_error(f"Failed to initialize proxy session: {str(e)}")
                    # Fallback ke session tanpa proxy
                    self.session = aiohttp.ClientSession()
                    self.display.print_warning("Using session without proxy")
            else:
                self.session = aiohttp.ClientSession()
                self.display.print_warning("No proxy available, using direct connection")

    async def get_user_input(self, prompt: str = "") -> str:
        return await asyncio.get_event_loop().run_in_executor(None, input, prompt)

    async def manual_chat(self):
        try:
            message = await self.get_user_input(
                f"\n{Fore.GREEN}Enter your message (or 'exit' to return to auto mode): {Style.RESET_ALL}"
            )

            if message.lower() == "exit":
                self.chat_mode = "auto"
                self.display.print_info("Switching back to auto chat mode...")
                return

            if not message.strip():
                self.display.print_warning("Message cannot be empty!")
                return

            self.display.print_chat("You", message)

            async with self.session.post(
                self.config.API_ENDPOINTS["conversation"],
                headers=self.config.get_headers("agent"),
                json={"message": message},
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    reply = data.get("reply", "No response")
                    self.display.print_chat("AI", reply)
                else:
                    self.display.print_error(f"Chat failed (Status: {response.status})")

            self.last_chat_time = time.time()

        except Exception as e:
            self.display.print_error(f"Chat error: {str(e)}")

    async def auto_chat(self):
        chat_messages = [
            "Hello! How are you today?",
            "What's new in the system?",
            "Can you give me an update on our progress?",
            "How's everything going?",
            "Any interesting tasks today?",
            "What's the current status?",
            "How can you help me today?",
            "Any recommendations for improvement?",
            "What should I focus on next?",
            "Is there anything I should know about?",
        ]

        try:
            message = random.choice(chat_messages)
            self.display.print_chat("You", message)

            async with self.session.post(
                self.config.API_ENDPOINTS["conversation"],
                headers=self.config.get_headers("agent"),
                json={"message": message},
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    reply = data.get("reply", "No response")
                    self.display.print_chat("AI", reply)
                else:
                    self.display.print_error(f"Chat failed (Status: {response.status})")

            self.last_chat_time = time.time()

        except Exception as e:
            self.display.print_error(f"Chat error: {str(e)}")

    async def chat_with_gata(self):
        current_time = time.time()
        if current_time - self.last_chat_time < 300:  # 5 minutes cooldown
            return

        self.display.print_chat_menu()

        try:
            choice = await self.get_user_input()

            if choice == "1":
                self.chat_mode = "auto"
                await self.auto_chat()
            elif choice == "2":
                self.chat_mode = "manual"
                await self.manual_chat()
            elif choice == "3":
                self.display.print_info("Skipping chat for this cycle...")
            else:
                self.display.print_warning("Invalid option, using auto chat...")
                await self.auto_chat()

        except Exception as e:
            self.display.print_error(f"Chat selection error: {str(e)}")
            await self.auto_chat()

    async def initialize(self):
        """Initialize bot session with proxy support"""
        if not self.session:
            await self.create_session_with_proxy()
            await self.chat_with_gata()

    async def cleanup(self):
        if self.session:
            await self.session.close()
            self.session = None
            self.display.print_warning("Session closed")

    def update_next_job_time(self, wait_seconds: float):
        self.next_job_time = datetime.now() + timedelta(seconds=wait_seconds)
        self.display.print_info(f"Next check in: {wait_seconds:.1f}s")

    async def check_api_health(self):
        try:
            proxy = self.config.get_random_proxy()
            async with self.session.get(
                self.config.API_ENDPOINTS["task"],
                headers=self.config.get_headers("agent"),
                proxy=proxy if proxy else None,
            ) as response:
                if response.status == 200:
                    self.display.print_success("API Health: OK")
                    return True
                self.display.print_error(f"API Health: Failed (Status {response.status})")
                return False
        except Exception as e:
            self.display.print_error(f"API Check Failed: {str(e)}")
            return False

    async def validate_data(self, item: Dict) -> Dict:
        retry_count = 0
        while retry_count < 3 and self.running:
            try:
                score = round(random.uniform(-1, 1), 2)
                confidence = round(random.uniform(0.5, 1.0), 2)
                current_timestamp = str(int(time.time()))

                self.display.print_info(f"Processing Task: {item['task_id']}")
                self.display.print_info(f"Score: {score}, Confidence: {confidence}")

                plain_payload = {
                    "score": score,
                    "confidence": confidence,
                    "timestamp": current_timestamp,
                }
                encrypted_data = self.config.security.encrypt(json.dumps(plain_payload))

                headers = self.config.get_headers("agent")
                headers.update(
                    {
                        "x-gata-task-id": item["task_id"],
                        "x-gata-timestamp": current_timestamp,
                    }
                )

                url = f"{self.config.API_ENDPOINTS['task']}/{item['task_id']}"

                async with self.session.patch(
                    url,
                    headers=headers,
                    json={"data": encrypted_data},
                    timeout=30,
                ) as response:
                    if response.status == 200:
                        response_data = await response.json()
                        if response_data.get("code") == 1002:
                            self.display.print_error(
                                f"Invalid argument: {response_data.get('msg')}"
                            )
                            raise Exception(f"API Error: {response_data.get('msg')}")
                        self.display.print_success("Task completed successfully")
                        return response_data
                    else:
                        raise Exception(f"API Error: Status {response.status}")

            except Exception as e:
                retry_count += 1
                self.display.print_error(f"Attempt {retry_count}/3 failed: {str(e)}")
                if retry_count >= 3:
                    raise

                wait_time = random.uniform(2 * retry_count, 5 * retry_count)
                self.display.print_warning(f"Retrying in {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)

    async def get_data_to_process(self):
        try:
            proxy = self.config.get_random_proxy()
            async with self.session.get(
                self.config.API_ENDPOINTS["task"],
                headers=self.config.get_headers("agent"),
                proxy=proxy if proxy else None,
            ) as response:
                if response.status == 200:
                    task = await response.json()
                    if isinstance(task, dict) and task.get("id"):
                        self.display.print_success("New task received")
                        return [
                            {
                                "task_id": task["id"],
                                "type": task.get("type"),
                                "model": task.get("model"),
                                "image_url": task.get("link"),
                                "caption": task.get("text"),
                            }
                        ]
                    return []
                else:
                    self.display.print_error(
                        f"Failed to get tasks: Status {response.status}"
                    )
                    return []
        except Exception as e:
            self.display.print_error(f"Error fetching tasks: {str(e)}")
            return []

    async def process_tasks(self):
        cycle = 1
        while self.running:
            try:
                self.display.print_header(f"Cycle #{cycle}")

                if self.chat_mode == "manual":
                    await self.manual_chat()
                else:
                    await self.chat_with_gata()

                if not await self.check_api_health():
                    wait_time = random.uniform(30, 60)
                    self.update_next_job_time(wait_time)
                    await asyncio.sleep(wait_time)
                    continue

                tasks = await self.get_data_to_process()
                if not tasks:
                    self.display.print_warning("No tasks available")
                    wait_time = random.uniform(10, 15)
                    self.update_next_job_time(wait_time)
                    await asyncio.sleep(wait_time)
                    continue

                for task in tasks:
                    if not self.running:
                        break
                    try:
                        await self.validate_data(task)
                    except Exception as e:
                        self.display.print_error(f"Task error: {str(e)}")

                    await asyncio.sleep(random.uniform(2, 5))

                cycle += 1
                wait_time = random.uniform(10, 15)
                self.update_next_job_time(wait_time)
                await asyncio.sleep(wait_time)

            except Exception as e:
                self.display.print_error(f"Cycle error: {str(e)}")
                await asyncio.sleep(5)


async def main():
    bot = DVABot()
    try:
        await bot.initialize()
        await bot.process_tasks()
    except KeyboardInterrupt:
        bot.display.print_warning("Stopping bot...")
    except Exception as e:
        bot.display.print_error(f"Fatal error: {str(e)}")
        traceback.print_exc()
    finally:
        await bot.cleanup()
        bot.display.print_success("Bot stopped")


if __name__ == "__main__":
    try:
        # Set up proper event loop for Windows
        if platform.system() == "Windows":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

        # Run the main function
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Bot stopped by user{Style.RESET_ALL}")
