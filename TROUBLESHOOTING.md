# Troubleshooting NoVo Voice Conversation

## Issue: App Cannot Hear Me

### Quick Checks:

1. **Check Browser Console**
   - Open browser DevTools (F12 or Cmd+Option+I)
   - Go to Console tab
   - Look for errors related to:
     - Microphone access
     - WebSocket connection
     - Audio streaming

2. **Check Microphone Permission**
   - Browser should ask for microphone permission
   - Make sure you clicked "Allow"
   - Check browser settings: `chrome://settings/content/microphone`

3. **Check WebSocket Connection**
   - In Console, you should see:
     - `✅ Connected to Hume EVI`
     - `🎤 Audio streaming started`
   - If not, check Network tab → WS filter

4. **Check Server Logs**
   - In your terminal running `npm run dev`
   - Look for:
     - `🔌 Client connected to Hume WebSocket`
     - `✅ Connected to Hume EVI`
     - `📤 Client -> Hume:` (audio data being sent)

---

## Common Issues & Solutions

### 1. "Microphone access denied"

**Problem**: Browser blocked microphone access

**Solution**:
- Click the 🔒 or ⓘ icon in browser address bar
- Find "Microphone" permission
- Change to "Allow"
- Refresh the page

### 2. "WebSocket connection failed"

**Problem**: Cannot connect to backend

**Solution**:
- Make sure server is running: `npm run dev`
- Check that backend is on port 3000
- Check that frontend is on port 5174
- Try: http://localhost:3000/api/health (should return `{"success": true}`)

### 3. "Connected but no audio streaming"

**Problem**: Audio context not starting

**Solution**:
- Check browser console for errors
- Try clicking the page first (browsers require user interaction)
- Check if `AudioContext` is supported: `console.log(typeof AudioContext)`

### 4. "Hume API error"

**Problem**: Invalid Hume API credentials

**Solution**:
- Check `.env` file has correct:
  - `HUME_API_KEY`
  - `HUME_SECRET_KEY`
  - `NEXT_PUBLIC_HUME_CONFIG_ID`
- Restart server after changing `.env`

### 5. "Audio streaming but Hume not responding"

**Problem**: Hume EVI configuration issue

**Solution**:
- Check Hume dashboard: https://platform.hume.ai
- Verify your EVI configuration ID is correct
- Check if your Hume account has credits
- Test with Hume's playground first

---

## Debug Steps

### Step 1: Test Microphone Access

Open browser console and run:

```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Microphone error:', err));
```

### Step 2: Test WebSocket Connection

Open browser console and run:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/hume?userId=test');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (err) => console.error('❌ WebSocket error:', err);
ws.onclose = () => console.log('WebSocket closed');
```

### Step 3: Check Audio Context

Open browser console and run:

```javascript
const ctx = new AudioContext({ sampleRate: 16000 });
console.log('AudioContext state:', ctx.state);
console.log('Sample rate:', ctx.sampleRate);
```

### Step 4: Test Hume API Directly

In terminal:

```bash
curl -X POST "https://api.hume.ai/v0/assistant/chat" \
  -H "X-Hume-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"config_id": "YOUR_CONFIG_ID"}'
```

---

## Expected Console Output

### When Working Correctly:

**Browser Console:**
```
✅ Connected to Hume EVI
🎤 Audio streaming started
Received from Hume: {type: "user_message", ...}
Received from Hume: {type: "assistant_message", ...}
🔊 Playing audio from NoVo
```

**Server Console:**
```
🔌 Client connected to Hume WebSocket
✅ Connected to Hume EVI
📤 Client -> Hume: (binary audio data)
📥 Hume -> Client: user_message
📥 Hume -> Client: assistant_message
```

---

## Still Not Working?

### Check These:

1. **Hume API Status**
   - Visit: https://status.hume.ai
   - Check if Hume services are operational

2. **Browser Compatibility**
   - Use Chrome, Edge, or Firefox (latest version)
   - Safari may have issues with WebRTC

3. **Network Issues**
   - Check firewall settings
   - Try disabling VPN
   - Check if WebSocket connections are blocked

4. **API Key Issues**
   - Regenerate Hume API keys
   - Make sure keys are not expired
   - Check account has active subscription

---

## Alternative: Test with Simple Mode

If hands-free isn't working, you can test with a simpler push-to-talk mode first.

Let me know which error you're seeing and I can help fix it!

---

## Get Help

If you're still stuck, share:
1. Browser console errors (screenshot or copy/paste)
2. Server terminal output
3. What happens when you click "Start Conversation"
4. Browser and OS version

