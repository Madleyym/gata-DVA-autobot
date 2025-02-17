import asyncio
import aiohttp
import json
import sys
import random
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional
from config import Config
import os
import signal


class DVABot:
    def __init__(self):
        self.config = Config()
        self.setup_directories()
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = True
        self.setup_signal_handlers()

    def setup_directories(self) -> None:
        os.makedirs("results", exist_ok=True)
        os.makedirs("logs", exist_ok=True)

    def setup_signal_handlers(self) -> None:
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

    def handle_shutdown(self, signum, frame) -> None:
        print("\nShutdown signal received. Cleaning up...")
        self.running = False

    async def create_session(self) -> None:
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close_session(self) -> None:
        if self.session:
            await self.session.close()
            self.session = None

    async def validate_data(self, image_url: str, caption: str) -> Dict:
        await self.create_session()
        retry_count = 0
        request_id = self.config.generate_request_id()

        while retry_count < self.config.MAX_RETRIES and self.running:
            try:
                payload = {
                    "image_url": image_url,
                    "caption": caption,
                    "timestamp": self.config.get_current_utc_formatted(),
                    "request_id": request_id,
                }

                # Encrypt sensitive data
                encrypted_payload = self.config.security.encrypt(json.dumps(payload))

                async with self.session.patch(
                    self.config.API_ENDPOINTS["task"],
                    headers=self.config.get_headers(),
                    json={"data": encrypted_payload},
                    proxy=self.config.get_random_proxy(),
                    timeout=self.config.TIMEOUT,
                ) as response:
                    # Log request
                    self.config.log_request(
                        {
                            "request_id": request_id,
                            "endpoint": "task",
                            "status": response.status,
                        }
                    )

                    # Handle rate limiting
                    if "x-ratelimit-remaining" in response.headers:
                        self.config.RATE_LIMIT["remaining"] = int(
                            response.headers["x-ratelimit-remaining"]
                        )

                    if response.status == 200:
                        content = await response.read()
                        return json.loads(content) if content else {}
                    else:
                        raise Exception(f"API Error: {response.status}")

            except Exception as e:
                retry_count += 1
                if retry_count >= self.config.MAX_RETRIES:
                    self.config.logger.error(
                        f"Validation failed after {retry_count} retries: {str(e)}"
                    )
                    raise
                await asyncio.sleep(random.uniform(2, 5))

    async def process_batch(self, data_batch: List[Dict]) -> List[Dict]:
        results = []

        for item in data_batch:
            if not self.running:
                break

            try:
                # Add random delay between requests (2-5 seconds)
                await asyncio.sleep(random.uniform(2, 5))

                result = await self.validate_data(item["image_url"], item["caption"])
                results.append(result)

                # Check rate limit
                if self.config.RATE_LIMIT["remaining"] <= 0:
                    wait_time = self.config.RATE_LIMIT["reset"] - int(time.time())
                    if wait_time > 0:
                        self.config.logger.info(
                            f"Rate limit reached. Waiting {wait_time} seconds..."
                        )
                        await asyncio.sleep(wait_time)

            except Exception as e:
                self.config.logger.error(f"Error processing item: {str(e)}")
                continue

        return results

    def save_results(self, results: List[Dict]) -> str:
        timestamp = self.config.get_current_utc_formatted("%Y%m%d_%H%M%S")
        filename = f"results/dva_results_{timestamp}.json"

        try:
            with open(filename, "w") as f:
                json.dump(results, f, indent=2)
            self.config.logger.info(f"Results saved to {filename}")
            return filename
        except Exception as e:
            self.config.logger.error(f"Error saving results: {str(e)}")
            raise


async def main():
    bot = DVABot()

    try:
        print(f"\n[{bot.config.get_current_utc_formatted()}] Starting DVA Bot")
        print("Initializing session...")

        # Example batch data
        test_batch = [
            {
                "image_url": "https://example.com/image1.jpg",
                "caption": "A beautiful sunset over the mountains",
            },
            {
                "image_url": "https://example.com/image2.jpg",
                "caption": "A cat playing with a ball of yarn",
            },
        ]

        results = await bot.process_batch(test_batch)
        output_file = bot.save_results(results)

        print(f"\nProcessing completed successfully!")
        print(f"Results saved to: {output_file}")

    except Exception as e:
        print(f"\n[ERROR] An error occurred:")
        traceback.print_exc()
        sys.exit(1)
    finally:
        await bot.close_session()


if __name__ == "__main__":
    asyncio.run(main())
