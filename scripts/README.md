# NoVo Idle Loop Video Generator

## Quick Start

1. **Open the generator:**
   ```bash
   open generate-idle-video.html
   ```
   Or simply double-click the `generate-idle-video.html` file.

2. **Record the idle loop:**
   - Click "Start Recording"
   - Wait 5-10 seconds (this will be your loop)
   - Click "Stop Recording"
   - Click "Download Video"

3. **Convert to MP4 (if needed):**
   ```bash
   # Install ffmpeg if you don't have it
   brew install ffmpeg
   
   # Convert webm to mp4
   ffmpeg -i novo-idle-loop.webm -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k novo-idle-loop.mp4
   ```

4. **Place the video:**
   ```bash
   mkdir -p ../client/public/videos
   mv novo-idle-loop.mp4 ../client/public/videos/idle-loop.mp4
   ```

## Alternative: Use AI Video Generation

### Option 1: HeyGen
1. Go to https://www.heygen.com/
2. Create an avatar
3. Generate a 5-10 second idle animation
4. Download and place in `client/public/videos/idle-loop.mp4`

### Option 2: D-ID
1. Go to https://www.d-id.com/
2. Upload a photo or use their avatars
3. Generate idle animation
4. Download and place in `client/public/videos/idle-loop.mp4`

### Option 3: Runway ML
1. Go to https://runwayml.com/
2. Use Gen-2 to create video from text
3. Prompt: "A friendly AI assistant avatar with a gentle breathing animation, idle loop"
4. Download and place in `client/public/videos/idle-loop.mp4`

## Video Specifications

For best results, your idle loop should be:
- **Duration:** 5-10 seconds (will loop seamlessly)
- **Resolution:** 800x800 or 1024x1024 (square format)
- **Format:** MP4 (H.264 codec)
- **Frame Rate:** 30 FPS
- **Content:** Gentle breathing/idle animation that loops smoothly

## Testing

After placing your video, restart the dev server:
```bash
cd ../novo-app
npm run dev
```

The VideoPlayer component will automatically detect and use the video if it exists at `/videos/idle-loop.mp4`.

