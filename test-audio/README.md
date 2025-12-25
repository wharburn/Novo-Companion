# Test Audio Files

Place your recorded WebM audio files here for automated testing.

## How to Record Test Audio

1. Open `audio-test-suite.html` in your browser
2. Click "Start Recording"
3. Speak clearly for 3-5 seconds
4. Click "Stop Recording"
5. Click "Download"
6. Move the downloaded file to this directory

## Suggested Test Phrases

- "Hello, my name is Wayne and I'm testing the audio system"
- "Can you hear me clearly? I'm speaking into the microphone"
- "This is a test recording for the Hume EVI integration"
- "I want to make sure the audio quality is good"
- "Let's see if this works properly with the voice recognition"

## Running Tests

From the `novo-app` directory, run:

```bash
node run-all-tests.mjs
```

This will automatically test all audio files in:
- This directory (`test-audio/`)
- Your Downloads folder (`~/Downloads/`)
- The main `novo-app/` directory

