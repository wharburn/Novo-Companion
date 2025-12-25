# NoVo Setup Checklist

Use this checklist to get NoVo up and running.

## ✅ Pre-Deployment Checklist

### 1. API Keys (Already Configured)
- [x] Hume API Key
- [x] Hume Secret Key
- [x] Hume Config ID
- [x] D-ID API Key

### 2. Required Services (Need to Set Up)
- [ ] **Upstash Redis** - Session storage
  - [ ] Create account at https://console.upstash.com
  - [ ] Create Redis database
  - [ ] Copy REST URL to `.env`
  - [ ] Copy Token to `.env`
  
- [ ] **Upstash Vector** - Family tree & memories
  - [ ] Create Vector index (dimension: 1536)
  - [ ] Copy URL to `.env`
  - [ ] Copy Token to `.env`
  
- [ ] **OpenAI API** - Vision AI
  - [ ] Create account at https://platform.openai.com
  - [ ] Generate API key
  - [ ] Add to `.env`
  - [ ] Add billing method (required for GPT-4 Vision)

### 3. Optional Services
- [ ] **Anthropic API** - Alternative vision AI
  - [ ] Create account at https://console.anthropic.com
  - [ ] Generate API key
  - [ ] Add to `.env`
  
- [ ] **AWS S3** - Photo storage
  - [ ] Create S3 bucket
  - [ ] Create IAM user with S3 permissions
  - [ ] Generate access keys
  - [ ] Add to `.env`

### 4. Local Development
- [ ] Install Node.js 18+
- [ ] Install dependencies: `npm install`
- [ ] Update `.env` file with all keys
- [ ] Run dev server: `npm run dev`
- [ ] Test at http://localhost:5173
- [ ] Verify Hume connection works
- [ ] Test camera/vision feature
- [ ] Add test family member
- [ ] Upload test photo (if S3 configured)

### 5. Docker Testing (Optional)
- [ ] Install Docker
- [ ] Build image: `docker build -t novo-app .`
- [ ] Run container: `docker run -p 3000:3000 --env-file .env novo-app`
- [ ] Test at http://localhost:3000

## 🚀 Deployment Checklist

### 1. Prepare Repository
- [ ] Initialize Git: `git init`
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial commit"`
- [ ] Create GitHub repository
- [ ] Push to GitHub: `git push -u origin main`

### 2. Render Setup
- [ ] Create Render account at https://render.com
- [ ] Connect GitHub account
- [ ] Create new Web Service
- [ ] Select "Blueprint" deployment
- [ ] Connect your repository
- [ ] Render detects `render.yaml`

### 3. Environment Variables on Render
Add these in Render dashboard:

- [ ] `HUME_API_KEY`
- [ ] `HUME_SECRET_KEY`
- [ ] `NEXT_PUBLIC_HUME_CONFIG_ID`
- [ ] `DID_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `UPSTASH_REDIS_URL`
- [ ] `UPSTASH_REDIS_TOKEN`
- [ ] `UPSTASH_VECTOR_URL`
- [ ] `UPSTASH_VECTOR_TOKEN`
- [ ] `AWS_ACCESS_KEY_ID` (optional)
- [ ] `AWS_SECRET_ACCESS_KEY` (optional)
- [ ] `S3_BUCKET_NAME` (optional)

### 4. Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build (5-10 minutes)
- [ ] Check build logs for errors
- [ ] Verify deployment success

## 🧪 Post-Deployment Testing

### 1. Health Check
- [ ] Visit `https://your-app.onrender.com/api/health`
- [ ] Verify response: `{"success": true, "status": "healthy"}`

### 2. Feature Testing
- [ ] Open app in browser
- [ ] Click "Connect to NoVo"
- [ ] Verify WebSocket connection
- [ ] Test voice conversation
- [ ] Try "Show NoVo" camera feature
- [ ] Add a family member
- [ ] Upload a photo (if S3 configured)
- [ ] Change settings
- [ ] Test proactive mode settings

### 3. Monitor Logs
- [ ] Check Render logs for errors
- [ ] Verify no API key errors
- [ ] Check database connections
- [ ] Monitor WebSocket connections

## 📊 Monitoring Setup

### 1. Upstash Monitoring
- [ ] Check Redis usage in dashboard
- [ ] Monitor Vector index queries
- [ ] Set up usage alerts

### 2. API Usage
- [ ] Monitor OpenAI API usage
- [ ] Check Hume AI usage
- [ ] Set billing alerts

### 3. Render Monitoring
- [ ] Enable auto-deploy on push
- [ ] Set up health check alerts
- [ ] Monitor resource usage

## 🔒 Security Checklist

- [ ] Verify `.env` is in `.gitignore`
- [ ] Never commit API keys to Git
- [ ] Enable S3 encryption (if using)
- [ ] Use HTTPS only (Render provides free SSL)
- [ ] Set up CORS properly
- [ ] Implement rate limiting (future)
- [ ] Regular API key rotation (future)

## 📈 Optimization (After Launch)

- [ ] Monitor performance metrics
- [ ] Optimize image sizes
- [ ] Implement caching strategies
- [ ] Add CDN for static assets
- [ ] Database query optimization
- [ ] WebSocket connection pooling

## 🎯 Feature Roadmap

- [ ] Medication reminders
- [ ] Appointment tracking
- [ ] Caregiver portal
- [ ] Voice activity detection
- [ ] Emotion tracking dashboard
- [ ] Multi-language support
- [ ] Mobile app (React Native)

## 💡 Quick Reference

### Start Development
```bash
cd novo-app
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Docker Build
```bash
docker build -t novo-app .
docker run -p 3000:3000 --env-file .env novo-app
```

### View Logs (Render)
- Dashboard → Your Service → Logs tab

### Update Environment Variables (Render)
- Dashboard → Your Service → Environment tab

---

## ✅ Ready to Launch?

Once all items are checked, you're ready to deploy NoVo to production! 🚀

**Estimated Setup Time:**
- Required services: 15-20 minutes
- Local testing: 10 minutes
- Deployment: 10 minutes
- **Total: ~40 minutes**

Good luck! 🎉

