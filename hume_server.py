#!/usr/bin/env python3
"""
NoVo Hume EVI WebSocket Server with Expression Measurement
Bridges the React frontend with Hume EVI using Python SDK
Also analyzes facial expressions from webcam frames
"""

import asyncio
import base64
import json
import os
import tempfile
from dotenv import load_dotenv
from hume import MicrophoneInterface, Stream
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions
import websockets
import openai

load_dotenv()

HUME_API_KEY = os.getenv("HUME_API_KEY")
HUME_CONFIG_ID = os.getenv("NEXT_PUBLIC_HUME_CONFIG_ID")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MIC_DEVICE = int(os.getenv("MIC_DEVICE", "0"))  # Set in .env or run with MIC_DEVICE=3
WS_PORT = 8765

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Store current emotions and EVI socket for context injection
current_emotions = []
evi_socket_ref = None
camera_just_enabled = False  # Track if camera was just enabled


def describe_image_sync(image_data: str) -> str:
    """Use OpenAI Vision to describe what's in the image"""
    if not openai_client:
        return "I can see you but image description is not available."

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Briefly describe what you see in this image in 1-2 sentences. Focus on the person and their surroundings. Be warm and friendly.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=100,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ Vision API error: {e}")
        return "I can see you now!"


async def describe_image(image_data: str) -> str:
    """Async wrapper for image description"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, describe_image_sync, image_data)


async def send_context_to_evi(context_msg: str, display_msg: str = None):
    """Send context message to EVI - injects context then sends display message"""
    global evi_socket_ref
    if not evi_socket_ref:
        print("❌ No EVI socket available")
        return
    from hume.empathic_voice.types import UserInput

    try:
        # Combine context and display message
        combined_msg = context_msg
        if display_msg:
            combined_msg = f"[SYSTEM CONTEXT: {context_msg}] {display_msg}"

        # Use send_publish with UserInput (replaces deprecated send_user_input)
        user_input = UserInput(text=combined_msg)
        await evi_socket_ref.send_publish(user_input)
    except Exception as e:
        print(f"❌ Error sending to EVI: {type(e).__name__}: {e}")


async def analyze_face_frame(client, image_data: str, websocket):
    """Analyze a face frame - use OpenAI Vision to describe what's seen"""
    global current_emotions, evi_socket_ref, camera_just_enabled
    should_notify_evi = camera_just_enabled
    camera_just_enabled = False  # Reset flag

    # Only process when camera is first enabled (not every frame)
    if not should_notify_evi:
        return

    print(
        f"📷 First frame received, will notify EVI (socket: {evi_socket_ref is not None})"
    )

    try:
        # Use OpenAI Vision to describe what we see
        print("📷 Getting image description from OpenAI...")
        description = await describe_image(image_data)
        print(f"📷 Got description: {description}")

        if evi_socket_ref:
            # Send context with simple display message
            context = f"The user just enabled their camera. {description} Acknowledge that you can now see them and comment warmly on what you observe."
            display = "Turned on Camera - Image sent to Novo"
            print(f"📷 Sending to EVI: {context[:80]}...")
            await send_context_to_evi(context, display)
            print("📷 Vision context sent successfully!")
        else:
            print("❌ No EVI socket available")

    except Exception as e:
        print(f"❌ Vision error: {type(e).__name__}: {e}")


async def handle_picture(image_data: str, websocket):
    """Handle a picture taken by the user - describe it and ask about relevance"""
    global evi_socket_ref
    try:
        if not evi_socket_ref:
            print("⚠️ Cannot process picture - not connected to EVI")
            return

        # Get image description
        description = await describe_image(image_data)

        # Send to EVI with instruction to describe and ask about relevance
        context = f"The user just took a picture to show you. Here's what's in the image: {description}. First, acknowledge that you received the photo and describe what you see in a warm, friendly way. Then, ask the user why they wanted to take this photo or how it's relevant to them - be curious and engaged about what made them want to share this with you."
        display = "Took a picture - sent to Novo"

        print(f"📸 Sending picture to EVI: {description[:80]}...")
        await send_context_to_evi(context, display)

        # Notify client
        await websocket.send(
            json.dumps({"type": "picture_processed", "description": description})
        )

    except Exception as e:
        print(f"❌ Error processing picture: {e}")


async def handle_client(websocket):
    """Handle a client WebSocket connection"""
    global current_emotions, evi_socket_ref
    print("🔌 Client connected")

    client = AsyncHumeClient(api_key=HUME_API_KEY)
    stream = Stream.new()
    evi_socket = None

    async def on_message(message):
        """Handle messages from Hume EVI"""
        try:
            msg_type = message.type

            if msg_type == "chat_metadata":
                await websocket.send(
                    json.dumps({"type": "chat_metadata", "chat_id": message.chat_id})
                )
            elif msg_type == "user_message":
                # Include current emotions with user message for context
                content = message.message.content
                await websocket.send(
                    json.dumps({"type": "user_message", "content": content})
                )
            elif msg_type == "assistant_message":
                await websocket.send(
                    json.dumps(
                        {
                            "type": "assistant_message",
                            "content": message.message.content,
                        }
                    )
                )
            elif msg_type == "audio_output":
                audio_data = base64.b64decode(message.data.encode("utf-8"))
                await stream.put(audio_data)
                await websocket.send(
                    json.dumps({"type": "audio_output", "data": message.data})
                )
                await websocket.send(json.dumps({"type": "speaking_start"}))
            elif msg_type == "assistant_end":
                await websocket.send(json.dumps({"type": "speaking_end"}))
            elif msg_type == "user_interruption":
                await websocket.send(json.dumps({"type": "user_interruption"}))
            elif msg_type == "error":
                await websocket.send(
                    json.dumps({"type": "error", "message": str(message.message)})
                )
        except Exception as e:
            print(f"❌ Error in on_message: {e}")

    async def receive_client_messages(stop_event):
        """Handle incoming messages from React client"""
        global camera_just_enabled
        try:
            async for message in websocket:
                data = json.loads(message)
                msg_type = data.get("type")
                if msg_type == "camera_enabled":
                    # Client just enabled camera - next frame should trigger EVI notification
                    camera_just_enabled = True
                    print("📷 Camera enabled by user")
                elif msg_type == "face_frame":
                    # Analyze face frame in background
                    asyncio.create_task(
                        analyze_face_frame(client, data["data"], websocket)
                    )
                elif msg_type == "picture":
                    # User took a picture - describe it and send to EVI
                    asyncio.create_task(handle_picture(data["data"], websocket))
                elif msg_type:
                    print(f"📥 Client message: {msg_type}")
        except websockets.exceptions.ConnectionClosed as e:
            print(f"⚠️ Client connection closed: {e}")
        except Exception as e:
            print(f"❌ Error in receive_client_messages: {e}")
        finally:
            stop_event.set()

    stop_event = asyncio.Event()

    try:
        async with client.empathic_voice.chat.connect_with_callbacks(
            options=ChatConnectOptions(config_id=HUME_CONFIG_ID),
            on_open=lambda: print("✅ Connected to Hume EVI"),
            on_message=on_message,
            on_close=lambda: print("🔌 Hume disconnected"),
            on_error=lambda err: print(f"❌ Hume error: {err}"),
        ) as socket:
            global evi_socket_ref
            evi_socket = socket
            evi_socket_ref = socket  # Set global ref for vision context
            await websocket.send(json.dumps({"type": "connected"}))

            # Start tasks
            mic_task = asyncio.create_task(
                MicrophoneInterface.start(
                    socket,
                    device=MIC_DEVICE,
                    allow_user_interrupt=True,
                    byte_stream=stream,
                )
            )
            client_task = asyncio.create_task(receive_client_messages(stop_event))

            # Wait for client to disconnect
            await stop_event.wait()

            # Cancel mic task when client disconnects
            mic_task.cancel()
            try:
                await mic_task
            except asyncio.CancelledError:
                pass

            # Close the audio stream to stop playback immediately
            try:
                await stream.close()
            except Exception:
                pass

            print("🔌 Client disconnected, stopped audio")

    except websockets.exceptions.ConnectionClosed:
        print("🔌 Client disconnected")
    except Exception as e:
        print(f"❌ Error: {e}")


async def main():
    print("=" * 60)
    print("🎙️  NoVo Hume EVI Server + Expression Measurement")
    print("=" * 60)
    print(f"\n✅ API Key: {HUME_API_KEY[:8]}...")
    print(f"✅ Config ID: {HUME_CONFIG_ID}")
    print(f"✅ Mic Device: {MIC_DEVICE} (set MIC_DEVICE env var to change)")
    print(f"✅ Facial Expression Analysis: ENABLED")
    print(f"\n🌐 WebSocket server starting on ws://localhost:{WS_PORT}")
    print("   Waiting for client connections...\n")

    async with websockets.serve(handle_client, "localhost", WS_PORT):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
