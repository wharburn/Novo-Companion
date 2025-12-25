#!/usr/bin/env python3
"""
NoVo Hume EVI Voice Assistant
Uses the Hume Python SDK for speech-to-speech conversation
"""

import asyncio
import base64
import os
from dotenv import load_dotenv
from hume import MicrophoneInterface, Stream
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions

# Load environment variables
load_dotenv()

HUME_API_KEY = os.getenv("HUME_API_KEY")
HUME_CONFIG_ID = os.getenv("NEXT_PUBLIC_HUME_CONFIG_ID")


async def main():
    print("=" * 60)
    print("🎙️  NoVo Voice Assistant (Hume EVI)")
    print("=" * 60)

    if not HUME_API_KEY:
        print("❌ Missing HUME_API_KEY in environment")
        return

    if not HUME_CONFIG_ID:
        print("❌ Missing NEXT_PUBLIC_HUME_CONFIG_ID in environment")
        return

    print(f"\n✅ API Key: {HUME_API_KEY[:8]}...")
    print(f"✅ Config ID: {HUME_CONFIG_ID}")
    print("\n🎤 Starting voice session...")
    print("   Speak to NoVo! Press Ctrl+C to stop.\n")

    try:
        client = AsyncHumeClient(api_key=HUME_API_KEY)

        # Create byte stream for audio output
        stream = Stream.new()

        # Message handler
        async def on_message(message):
            if message.type == "chat_metadata":
                print(f"📋 Chat ID: {message.chat_id}")
            elif message.type == "user_message":
                print(f"🧑 You: {message.message.content}")
            elif message.type == "assistant_message":
                print(f"🤖 NoVo: {message.message.content}")
            elif message.type == "audio_output":
                # Send audio to stream for playback
                await stream.put(base64.b64decode(message.data.encode("utf-8")))
            elif message.type == "error":
                print(f"❌ Error: {message.message}")
            else:
                print(f"📥 {message.type}")

        # Connect with callbacks
        async with client.empathic_voice.chat.connect_with_callbacks(
            options=ChatConnectOptions(config_id=HUME_CONFIG_ID),
            on_open=lambda: print("✅ Connected to Hume EVI!"),
            on_message=on_message,
            on_close=lambda: print("🔌 Disconnected"),
            on_error=lambda err: print(f"❌ Error: {err}"),
        ) as socket:
            # Start microphone with audio playback stream
            # Device 1 = MacBook Pro Microphone
            # Device 0 = WH-CH520 headset mic, Device 3 = MacBook Pro Microphone
            await MicrophoneInterface.start(
                socket, device=0, allow_user_interrupt=False, byte_stream=stream
            )

    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
