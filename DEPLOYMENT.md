# NoVo Deployment Guide

## Prerequisites Setup

Before deploying, you need to set up the following services:

### 1. Upstash Redis (Session Storage)

1. Go to https://upstash.com
2. Create account and new Redis database
3. Choose region closest to your users
4. Copy the REST URL and Token
5. Add to `.env`:
   ```
   UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_TOKEN=your_token_here
   ```

### 2. Upstash Vector (Family Tree & Memories)

1. In Upstash dashboard, create new Vector database
2. Choose dimension: 1536 (for OpenAI embeddings)
3. Copy URL and Token
4. Add to `.env`:
   ```
   UPSTASH_VECTOR_URL=https://your-vector-url.upstash.io
   UPSTASH_VECTOR_TOKEN=your_token_here
   ```

### 3. AWS S3 (Photo Storage)

**Option A: AWS S3**
1. Create AWS account
2. Create S3 bucket (e.g., `novo-family-photos`)
3. Enable encryption at rest
4. Create IAM user with S3 permissions
5. Generate access keys
6. Add to `.env`:
   ```
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   S3_BUCKET_NAME=novo-family-photos
   ```

**Option B: Cloudflare R2 (S3-compatible, cheaper)**
1. Create Cloudflare account
2. Go to R2 Object Storage
3. Create bucket
4. Generate API tokens
5. Use same AWS SDK configuration

### 4. OpenAI or Anthropic (Vision AI)

**For GPT-4 Vision:**
1. Go to https://platform.openai.com
2. Create API key
3. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

**For Claude 3.5 Sonnet:**
1. Go to https://console.anthropic.com
2. Create API key
3. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

You can configure both and let users choose in settings.

---

## Local Development

### 1. Install Dependencies

```bash
cd novo-app
npm install
```

### 2. Configure Environment

Edit `.env` file with all your API keys (see above).

### 3. Run Development Server

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### 4. Test Features

- Visit http://localhost:5173
- Click "Connect to NoVo" to test Hume EVI
- Try "Show NoVo" camera feature
- Add family members
- Adjust settings

---

## Deploy to Render

### Step 1: Prepare Repository

1. **Initialize Git** (if not already):
```bash
cd novo-app
git init
git add .
git commit -m "Initial NoVo app"
```

2. **Push to GitHub**:
```bash
# Create new repo on GitHub, then:
git remote add origin https://github.com/yourusername/novo-app.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Deploy with render.yaml

1. In Render dashboard, click "New +"
2. Select "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml`
5. Click "Apply"

### Step 4: Add Environment Variables

In Render dashboard, go to your service and add these environment variables:

```
HUME_API_KEY=bQvGqibCpWOG3SHgtZ4utXh7Nvhs7Hltp1YAFi6lSPvkD48A
HUME_SECRET_KEY=cGlr1kQMC8SgSnvN2tFYsDaYNLJsLDtz7qp4LkQ0QSINo0HShV7yKSTRSieDAwGp
NEXT_PUBLIC_HUME_CONFIG_ID=8fed717d-d05e-4268-b421-70c2fe785169
DID_API_KEY=d2F5bmVAd2hhcmJ1cm4uY29t:wThMUiCoozlCNFAGLM8ML
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
UPSTASH_VECTOR_URL=your_vector_url
UPSTASH_VECTOR_TOKEN=your_vector_token
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=novo-family-photos
```

### Step 5: Deploy

1. Click "Create Web Service"
2. Render will build Docker image
3. Wait for deployment (5-10 minutes)
4. Your app will be live at: `https://novo-app.onrender.com`

---

## Manual Docker Deployment (Alternative)

### Build and Test Locally

```bash
# Build image
docker build -t novo-app .

# Run container
docker run -p 3000:3000 --env-file .env novo-app

# Test at http://localhost:3000
```

### Deploy to Render with Docker

1. Create new Web Service
2. Choose "Docker"
3. Connect repository
4. Set Dockerfile path: `./Dockerfile`
5. Add environment variables
6. Deploy

---

## Post-Deployment Checklist

- [ ] Test health endpoint: `https://your-app.onrender.com/api/health`
- [ ] Test Hume EVI connection
- [ ] Test camera/vision feature
- [ ] Upload test family photo
- [ ] Verify proactive conversation settings
- [ ] Check logs for errors
- [ ] Set up custom domain (optional)
- [ ] Enable auto-deploy on push (optional)

---

## Monitoring & Logs

### View Logs in Render
1. Go to your service dashboard
2. Click "Logs" tab
3. Monitor real-time logs

### Health Check
- Render automatically monitors `/api/health`
- Service restarts if health check fails

---

## Scaling & Performance

### Render Plans
- **Starter**: $7/month - Good for testing
- **Standard**: $25/month - Production ready
- **Pro**: $85/month - High traffic

### Optimization Tips
1. Enable Redis caching
2. Use CDN for static assets
3. Compress images before upload
4. Implement rate limiting
5. Monitor Upstash usage

---

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check Node version (must be 18+)

### WebSocket Connection Fails
- Ensure Render plan supports WebSockets
- Check CORS settings
- Verify Hume API keys

### Vision AI Errors
- Verify API keys are correct
- Check API quota/billing
- Test with smaller images

### S3 Upload Fails
- Verify bucket permissions
- Check IAM user has PutObject permission
- Ensure bucket name is correct

---

## Security Best Practices

1. **Never commit .env file**
2. **Use environment variables** for all secrets
3. **Enable S3 encryption** at rest
4. **Implement rate limiting** on API endpoints
5. **Use HTTPS only** (Render provides free SSL)
6. **Regularly rotate API keys**
7. **Monitor usage** for unusual activity

---

## Cost Estimate (Monthly)

- Render Starter: $7
- Upstash Redis: $0-10 (free tier available)
- Upstash Vector: $0-10 (free tier available)
- AWS S3: $1-5 (depends on storage)
- OpenAI API: $10-50 (depends on usage)
- Hume AI: Pay per use

**Total: ~$30-100/month** depending on usage

---

## Next Steps

1. Deploy to Render
2. Test all features in production
3. Invite beta testers
4. Monitor usage and costs
5. Iterate based on feedback
6. Add medication reminders
7. Build caregiver portal

Good luck! 🚀

