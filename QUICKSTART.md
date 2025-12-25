# NoVo Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd novo-app
npm install
```

### Step 2: Set Up Required Services

You need these services (all have free tiers):

#### A. Upstash Redis (Free tier: 10K commands/day)
1. Visit https://console.upstash.com/redis
2. Click "Create Database"
3. Copy REST URL and Token to `.env`

#### B. Upstash Vector (Free tier: 10K queries/month)
1. Visit https://console.upstash.com/vector
2. Click "Create Index"
3. Dimension: 1536, Metric: Cosine
4. Copy URL and Token to `.env`

#### C. OpenAI API (For Vision)
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Add to `.env`

#### D. Cloudflare R2 (Optional - for photo storage)
- **Recommended**: Free 10GB, S3-compatible, no bandwidth fees
- Visit https://dash.cloudflare.com/sign-up
- See `CLOUDFLARE_R2_SETUP.md` for detailed guide
- Can skip for now and add later

### Step 3: Update .env File

Edit `novo-app/.env`:

```env
# Already configured:
HUME_API_KEY=bQvGqibCpWOG3SHgtZ4utXh7Nvhs7Hltp1YAFi6lSPvkD48A
HUME_SECRET_KEY=cGlr1kQMC8SgSnvN2tFYsDaYNLJsLDtz7qp4LkQ0QSINo0HShV7yKSTRSieDAwGp
NEXT_PUBLIC_HUME_CONFIG_ID=8fed717d-d05e-4268-b421-70c2fe785169
DID_API_KEY=d2F5bmVAd2hhcmJ1cm4uY29t:wThMUiCoozlCNFAGLM8ML

# Add these:
OPENAI_API_KEY=sk-...
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
UPSTASH_VECTOR_URL=https://...
UPSTASH_VECTOR_TOKEN=...

# Optional (can add later):
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=novo-photos
```

### Step 4: Run Development Server

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Step 5: Test the App

1. Open http://localhost:5173
2. Click "Connect to NoVo"
3. Try the "Show NoVo" camera feature
4. Go to Settings and configure proactive mode
5. Add a family member in the Family tab

---

## 📦 Deploy to Render (Production)

### Quick Deploy

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/novo-app.git
git push -u origin main
```

2. **Deploy on Render**:
   - Go to https://render.com
   - Click "New +" → "Blueprint"
   - Connect your repo
   - Add environment variables
   - Click "Apply"

3. **Done!** Your app will be live in ~10 minutes

---

## 🎯 What Works Right Now

✅ Hume EVI voice conversation
✅ Vision AI (camera analysis)
✅ Family member management
✅ Settings panel
✅ User profile storage
✅ Learning engine (extracts info from conversations)

## 🚧 What Needs Configuration

⚠️ Upstash Redis (required)
⚠️ Upstash Vector (required)
⚠️ OpenAI API (required for vision)
⚠️ S3 bucket (optional, for photos)

## 📝 Next Steps

1. Set up Upstash accounts (5 minutes)
2. Get OpenAI API key (2 minutes)
3. Update .env file
4. Run `npm run dev`
5. Test locally
6. Deploy to Render

---

## 💡 Tips

- **Start with free tiers** - All services have generous free tiers
- **Test locally first** - Make sure everything works before deploying
- **Monitor costs** - Set up billing alerts on all services
- **Use Docker** - Render supports Docker for easy deployment

---

## 🆘 Need Help?

Check these files:
- `README.md` - Full documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `.env.example` - All required environment variables

---

## 🎉 You're Ready!

Your NoVo app is ready to deploy. Just add the required API keys and you're good to go!

