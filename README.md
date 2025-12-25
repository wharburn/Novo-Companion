# NoVo - Enhanced AI Companion

An emotionally intelligent AI companion for elderly users with vision capabilities, family intelligence, and proactive conversation features.

## Features

- 🗣️ **Proactive Conversations** - NoVo initiates conversations at scheduled times using Hume EVI
- 👨‍👩‍👧‍👦 **Family Tree Builder** - Learns about family through natural dialogue
- 📸 **"Show NoVo" Vision** - Real-time camera analysis with GPT-4 Vision or Claude
- 🧠 **Natural Learning** - Remembers medical info, preferences, routines organically
- 📱 **Family Album** - Upload and organize family photos with S3 storage
- ⚙️ **Comprehensive Settings** - Full control over conversation mode, privacy, and features

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Voice AI**: Hume AI EVI
- **Vision AI**: GPT-4 Vision / Claude 3.5 Sonnet
- **Database**: Upstash Redis + Upstash Vector
- **Storage**: AWS S3
- **Deployment**: Render (Docker)

## Local Development

### Prerequisites

- Node.js 18+
- Docker (optional, for containerized development)
- API Keys:
  - Hume AI (API Key, Secret Key, Config ID)
  - D-ID (for video generation)
  - OpenAI or Anthropic (for vision)
  - Upstash Redis & Vector
  - AWS S3

### Setup

1. **Install dependencies**:
```bash
cd novo-app
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Run development server**:
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

### Build for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build Docker image:
```bash
docker build -t novo-app .
```

### Run container:
```bash
docker run -p 3000:3000 --env-file .env novo-app
```

## Deploy to Render

### Option 1: Using render.yaml (Recommended)

1. Push code to GitHub
2. Connect repository to Render
3. Render will auto-detect `render.yaml`
4. Add environment variables in Render dashboard
5. Deploy!

### Option 2: Manual Setup

1. Create new Web Service on Render
2. Select "Docker" environment
3. Set Dockerfile path: `./Dockerfile`
4. Add all environment variables from `.env.example`
5. Deploy

### Required Environment Variables on Render

```
HUME_API_KEY=your_key
HUME_SECRET_KEY=your_secret
NEXT_PUBLIC_HUME_CONFIG_ID=your_config_id
DID_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
UPSTASH_REDIS_URL=your_url
UPSTASH_REDIS_TOKEN=your_token
UPSTASH_VECTOR_URL=your_url
UPSTASH_VECTOR_TOKEN=your_token
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket
```

## Project Structure

```
novo-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VoiceControl.tsx
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── FamilyAlbum.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── humeEVI.js
│   │   ├── visionAI.js
│   │   ├── learningEngine.js
│   │   ├── upstashRedis.js
│   │   ├── upstashVector.js
│   │   ├── s3Storage.js
│   │   └── proactiveManager.js
│   └── index.js
├── Dockerfile
├── render.yaml
└── package.json
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/user/:userId` - Get user profile
- `PUT /api/user/:userId/settings` - Update settings
- `GET /api/family/:userId` - Get family members
- `POST /api/family/:userId` - Add family member
- `POST /api/photos/:userId/:memberName` - Upload photo
- `POST /api/vision/analyze` - Analyze image
- `WS /ws/hume` - Hume EVI WebSocket connection

## Features Roadmap

- [x] Core conversation with Hume EVI
- [x] Proactive conversation scheduling
- [x] Family tree with Vector DB
- [x] Vision AI integration
- [x] Photo upload to S3
- [x] Settings panel
- [ ] Medication reminders
- [ ] Appointment tracking
- [ ] Caregiver portal
- [ ] Voice activity detection
- [ ] Emotion tracking dashboard

## Support

For issues or questions, check:
- Hume AI docs: https://docs.hume.ai
- Upstash docs: https://docs.upstash.com
- Render docs: https://render.com/docs

## License

MIT

