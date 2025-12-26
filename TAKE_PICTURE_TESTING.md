# Take Picture Tool - Testing Guide

## Overview

The `take_picture` tool allows NoVo to see what the user is showing through their camera. This guide covers how to test and verify that the tool is working correctly.

## Changes Made to Fix the Tool

### 1. Registered the Tool with Hume EVI

**File:** `novo-app/client/src/components/VoiceControl.tsx`

Added tool definition in session settings:

```typescript
tools: [
  {
    type: 'function',
    name: 'take_picture',
    description: 'Captures a photo using the user\'s camera to see what the user is showing...',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
],
```

### 2. Added Visual Feedback

```typescript
if (toolName === 'take_picture' && toolCallId) {
  setTranscript((prev) => [...prev, '📸 Taking a picture...']);
  // ... capture and analyze
}
```

### 3. Enhanced Error Handling

- Added success/failure logging
- Proper error messages sent back to EVI
- Network error handling with try/catch

### 4. Fixed Vision API Response Format

**File:** `novo-app/server/routes/vision.js`

Fixed inconsistency between `description` (from visionAI service) and `analysis` (expected by frontend):

```javascript
result.data = {
  context: contextForEVI,
  analysis: result.description,
  provider: result.provider,
};
```

## How to Test

### Prerequisites

1. **Hume Configuration Requirements:**
   - Your EVI config must have a **supplemental LLM** (Claude, GPT, Gemini, or Moonshot)
   - The LLM must support function calling
   - Check your `NEXT_PUBLIC_HUME_CONFIG_ID` in `.env`

2. **Vision API Requirements:**
   - At least one of the following must be configured in `.env`:
     - `OPENAI_API_KEY` (for GPT-4 Vision)
     - `ANTHROPIC_API_KEY` (for Claude 3.5 Sonnet)

### Test Procedure

#### Step 1: Start the Application

```bash
cd novo-app
npm run dev
```

The server should start on `http://localhost:3000` and the client on `http://localhost:5173`.

#### Step 2: Connect to NoVo

1. Open `http://localhost:5173` in your browser
2. Click the NoVo avatar to connect
3. Wait for the "Connected - Speak now!" message

#### Step 3: Enable Camera

1. Click the **"Let NoVo See Me"** button
2. Grant camera permissions if prompted
3. You should see yourself in the preview (hidden in the UI)
4. Watch console for: `📷 Expression camera started`

#### Step 4: Test the Take Picture Tool

Try these voice commands:

**Direct Commands:**
- "Take a picture"
- "Can you see this?"
- "What do you see?"
- "Look at this"
- "I want to show you something"

**What to Observe:**

1. **Console Logs:**
   ```
   🔧 Tool call: take_picture <toolCallId>
   📸 Picture captured for tool call
   ✅ Vision analysis complete: <description>
   ```

2. **Transcript:**
   ```
   You: Take a picture
   📸 Taking a picture...
   NoVo: [Describes what it sees]
   ```

3. **Camera Flash:**
   - White flash overlay appears briefly

#### Step 5: Test Error Handling

**Test without camera enabled:**

1. Click **"Stop Seeing Me"** to disable camera
2. Say: "Take a picture"
3. Expected behavior:
   - Console: `⚠️ Camera not enabled for take_picture tool`
   - NoVo responds: "Camera is not enabled. Please turn on 'Let NoVo See Me' first."

**Test with network error:**

1. Stop the server (Ctrl+C)
2. Enable camera
3. Say: "Take a picture"
4. Expected: Network error message

### Verification Checklist

- [ ] Tool is invoked when user asks to take a picture
- [ ] Camera captures the current frame
- [ ] Image is sent to vision API successfully
- [ ] Vision API returns a description
- [ ] Description is sent back to EVI via `sendToolResponseMessage`
- [ ] NoVo responds with what it sees
- [ ] Flash effect appears
- [ ] Transcript shows "📸 Taking a picture..."
- [ ] Error handling works when camera is disabled
- [ ] Console logs are clear and helpful

## Common Issues & Solutions

### Issue 1: Tool Not Called

**Symptoms:**
- User says "take a picture" but nothing happens
- No `🔧 Tool call: take_picture` in console

**Solutions:**
1. Check that supplemental LLM is configured in Hume Platform
2. Verify LLM supports function calling (Claude, GPT, Gemini)
3. Check system prompt includes instructions to use the tool
4. Try more explicit command: "I want you to take a picture now"

### Issue 2: Vision Analysis Fails

**Symptoms:**
- Console shows: `❌ Vision analysis failed`
- NoVo doesn't describe what it sees

**Solutions:**
1. Check `.env` has either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
2. Verify API key is valid and has credits
3. Check server logs for vision API errors
4. Test vision API directly via `/api/vision/analyze`

### Issue 3: Camera Not Enabled Error

**Symptoms:**
- NoVo says "Camera is not enabled"
- Tool is called but `isCameraOn` is false

**Solutions:**
1. Click "Let NoVo See Me" button first
2. Grant camera permissions in browser
3. Check console for camera initialization errors
4. Verify camera is working in other apps

### Issue 4: No Response from NoVo

**Symptoms:**
- Picture taken, flash appears
- Vision analysis succeeds
- NoVo doesn't respond

**Solutions:**
1. Check that `toolCallId` is being captured correctly
2. Verify `sendToolResponseMessage` is called with correct format
3. Check WebSocket connection is still open
4. Look for errors in Hume message handling

## Advanced Testing

### Test Different Image Types

1. **Text/Documents:**
   - Hold up a book or document
   - Say: "What does this say?"
   - Verify: NoVo reads the text

2. **Objects:**
   - Show a common object (cup, phone, etc.)
   - Say: "What am I showing you?"
   - Verify: NoVo identifies the object

3. **People:**
   - Have someone else in frame
   - Say: "Who's with me?"
   - Verify: NoVo describes the person

### Test Rapid Succession

1. Enable camera
2. Say: "Take a picture" three times quickly
3. Verify: All three calls are handled correctly

### Test Concurrent Tools

1. Say: "Take a picture and search for information about what you see"
2. Verify: Both tools are called and coordinated

## Debugging Tips

### Enable Verbose Logging

Add to VoiceControl.tsx:

```typescript
socket.on('message', (message) => {
  console.log('📨 RAW MESSAGE:', JSON.stringify(message, null, 2));
  // ... existing handler
});
```

### Test Vision API Directly

```bash
curl -X POST http://localhost:3000/api/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<base64_image_data>",
    "type": "picture"
  }'
```

### Monitor Network Traffic

1. Open Chrome DevTools → Network tab
2. Filter by "vision" or "hume"
3. Inspect requests/responses

## Performance Notes

- **Camera frame rate:** 1 frame/second for expression analysis
- **Picture capture:** ~640x480 resolution, JPEG 90% quality
- **Vision API latency:** 1-3 seconds (GPT-4 Vision or Claude)
- **Total response time:** 2-5 seconds from trigger to NoVo's response

## Security Considerations

- Camera frames are NOT stored on server
- Images sent to vision API are temporary
- Base64 encoding prevents direct file access
- User must explicitly enable camera
- Camera permission required from browser

## Next Steps

If the tool is working correctly, consider:

1. **Adding photo storage** - Save pictures to S3/R2
2. **Photo history** - Show recent pictures in UI
3. **Better prompts** - Customize vision prompts for different contexts
4. **Multi-modal** - Combine vision with other context (location, time, etc.)
5. **Family recognition** - Integrate with family album for person identification
