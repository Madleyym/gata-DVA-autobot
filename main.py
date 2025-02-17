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
import time


class DVABot:
    def __init__(self):
        self.config = Config()
        print(
            "Token loaded:",
            (
                self.config.BEARER_TOKEN[:20] + "..."
                if self.config.BEARER_TOKEN
                else "No token"
            ),
        )
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = True
        self.setup_signal_handlers()

    def setup_signal_handlers(self) -> None:
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

    def handle_shutdown(self, signum, frame) -> None:
        print("\n👋 Shutdown signal received. Cleaning up...")
        self.running = False

    async def validate_data(self, item: Dict) -> Dict:
        """Validate data with the API"""
        retry_count = 0
        request_id = self.config.generate_request_id()

        while retry_count < self.config.MAX_RETRIES and self.running:
            try:
                payload = {
                    "id": item["task_id"],
                    "type": item["type"],
                    "model": item["model"],
                    "link": item["image_url"],
                    "offset": item["offset"],
                    "size": item["size"],
                    "text": item["caption"],
                    "point": item["point"],
                    "timestamp": self.config.get_current_utc_formatted(),
                    "request_id": request_id,
                }

                print(
                    f"\n🔄 Request attempt {retry_count + 1}/{self.config.MAX_RETRIES}"
                )
                print(f"📝 Processing task ID: {item['task_id']}")
                print(f"📝 Caption: {item['caption'][:50]}...")
                print(f"🔗 Image URL: {item['image_url']}")

                encrypted_payload = self.config.security.encrypt(json.dumps(payload))

                async with self.session.patch(
                    self.config.API_ENDPOINTS["task"],
                    headers=self.config.get_headers("agent"),
                    json={"data": encrypted_payload},
                    timeout=self.config.TIMEOUT,
                ) as response:
                    print(f"Validation Response Status: {response.status}")
                    print(f"Validation Headers: {dict(response.headers)}")

                    if response.status == 200:
                        content = await response.text()
                        print(f"Validation Response: {content}")
                        return json.loads(content) if content else {}
                    else:
                        error_content = await response.text()
                        print(f"Error response: {error_content}")
                        raise Exception(f"API Error: Status {response.status}")

            except Exception as e:
                retry_count += 1
                print(f"❌ Attempt {retry_count} failed: {str(e)}")

                if retry_count >= self.config.MAX_RETRIES:
                    raise

                wait_time = random.uniform(2 * retry_count, 5 * retry_count)
                print(f"⏳ Waiting {wait_time:.2f} seconds before retry...")
                await asyncio.sleep(wait_time)

    async def get_data_to_process(self):
        """Get available tasks to process"""
        try:
            async with self.session.get(
                self.config.API_ENDPOINTS["task"],
                headers=self.config.get_headers("agent"),
            ) as response:
                print(f"Tasks Response Status: {response.status}")
                print(f"Tasks Headers: {dict(response.headers)}")

                if response.status == 200:
                    task = await response.json()
                    print(f"Tasks Data: {json.dumps(task, indent=2)}")

                    # Handle single task response
                    if isinstance(task, dict):
                        return (
                            [
                                {
                                    "image_url": task.get("link"),
                                    "caption": task.get("text"),
                                    "task_id": task.get("id"),
                                    "type": task.get("type"),
                                    "model": task.get("model"),
                                    "offset": task.get("offset"),
                                    "size": task.get("size"),
                                    "point": task.get("point"),
                                }
                            ]
                            if all(task.get(k) for k in ["link", "text", "id"])
                            else []
                        )

                    elif isinstance(task, list):
                        return [
                            {
                                "image_url": t.get("link"),
                                "caption": t.get("text"),
                                "task_id": t.get("id"),
                                "type": t.get("type"),
                                "model": t.get("model"),
                                "offset": t.get("offset"),
                                "size": t.get("size"),
                                "point": t.get("point"),
                            }
                            for t in task
                            if all(t.get(k) for k in ["link", "text", "id"])
                        ]
                    else:
                        print("❌ Unexpected response format")
                        return []
                else:
                    print(f"❌ Failed to get tasks: {response.status}")
                    return []

        except Exception as e:
            print(f"❌ Error getting tasks: {str(e)}")
            traceback.print_exc()
            return []

    async def create_session(self) -> None:
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close_session(self) -> None:
        if self.session:
            await self.session.close()
            self.session = None

    async def continuous_processing(self):
        print(f"\n[{self.config.get_current_utc_formatted()}] DVA Bot started")
        print("Press Ctrl+C to stop the bot\n")

        cycle_count = 1
        while self.running:
            try:
                print(f"\n{'='*50}")
                print(
                    f"📍 Cycle #{cycle_count} - {self.config.get_current_utc_formatted()}"
                )
                print(f"{'='*50}")

                batch_data = await self.get_data_to_process()

                if not batch_data:
                    print("No data to process, waiting for next cycle...")
                    await asyncio.sleep(10)
                    continue

                for item in batch_data:
                    try:
                        await self.validate_data(item)
                    except Exception as e:
                        print(f"❌ Error processing item: {str(e)}")
                        continue

                    delay = random.uniform(2, 5)
                    print(f"\n⏳ Waiting {delay:.2f} seconds before next item...")
                    await asyncio.sleep(delay)

                print(f"\n✅ Cycle #{cycle_count} completed!")

                wait_time = random.uniform(10, 15)
                print(f"\n⏳ Starting next cycle in {wait_time:.2f} seconds...")
                await asyncio.sleep(wait_time)

                cycle_count += 1

            except Exception as e:
                print(f"\n❌ Error in cycle #{cycle_count}:")
                print(str(e))
                traceback.print_exc()
                print("\n⏳ Restarting in 5 seconds...")
                await asyncio.sleep(5)


async def main():
    bot = DVABot()

    try:
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] DVA Bot Starting")
        print("Initializing session...")
        await bot.create_session()
        await bot.continuous_processing()

    except KeyboardInterrupt:
        print("\n\n👋 Stopping bot gracefully...")
    except Exception as e:
        print(f"\n❌ Unexpected error:")
        traceback.print_exc()
        sys.exit(1)
    finally:
        await bot.close_session()
        print("\n✅ Bot stopped successfully!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Bot stopped by user.")
