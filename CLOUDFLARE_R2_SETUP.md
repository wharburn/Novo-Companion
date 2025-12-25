# Cloudflare R2 Setup Guide

## Why Cloudflare R2?

✅ **S3-Compatible** - Works with existing AWS SDK (no code changes!)
✅ **Free Tier**: 10GB storage + 1M operations/month
✅ **No Egress Fees** - Bandwidth is FREE (AWS charges $0.09/GB)
✅ **Cheaper Storage**: $0.015/GB vs AWS S3's $0.023/GB
✅ **Global CDN** - Fast worldwide access
✅ **Simple Setup** - 5 minutes to get started

---

## Step-by-Step Setup (5 minutes)

### 1. Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with email (free account)
3. Verify your email

### 2. Enable R2

1. In Cloudflare dashboard, click **R2** in left sidebar
2. Click **Purchase R2 Plan**
3. Select **Free Plan** (10GB storage, 1M operations/month)
4. Confirm (no credit card required for free tier)

### 3. Create R2 Bucket

1. Click **Create bucket**
2. **Bucket name**: `novo-family-photos` (or your choice)
3. **Location**: Automatic (or choose region closest to users)
4. Click **Create bucket**

### 4. Generate API Token

1. Click **Manage R2 API Tokens** (top right)
2. Click **Create API token**
3. **Token name**: `NoVo App`
4. **Permissions**: Select **Object Read & Write**
5. **TTL**: Leave as "Forever" (or set expiration)
6. Click **Create API Token**

### 5. Copy Credentials

You'll see three important values:

```
Access Key ID: abc123def456...
Secret Access Key: xyz789uvw012...
Endpoint: https://abc123.r2.cloudflarestorage.com
```

⚠️ **IMPORTANT**: Copy these NOW - you can't see the secret key again!

### 6. Update .env File

Open `novo-app/.env` and update:

```env
# Cloudflare R2 Configuration
AWS_ACCESS_KEY_ID=abc123def456...
AWS_SECRET_ACCESS_KEY=xyz789uvw012...
AWS_REGION=auto
S3_BUCKET_NAME=novo-family-photos
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
```

### 7. Test It!

```bash
cd novo-app
npm run dev
```

Then:
1. Open http://localhost:5173
2. Go to **Family** tab
3. Add a family member
4. Upload a photo
5. ✅ Photo should upload to R2!

---

## R2 Dashboard Features

### View Uploaded Files
1. Go to R2 dashboard
2. Click your bucket name
3. Browse uploaded photos

### Monitor Usage
1. R2 dashboard shows:
   - Storage used
   - Operations count
   - Bandwidth used

### Set Up Public Access (Optional)
If you want photos accessible via public URLs:

1. Click your bucket
2. Go to **Settings** tab
3. Click **Allow Access** under "Public Access"
4. Configure custom domain (optional)

---

## Pricing Breakdown

### Free Tier (Perfect for Testing)
- **Storage**: 10 GB/month
- **Class A Operations**: 1 million/month (uploads, lists)
- **Class B Operations**: 10 million/month (downloads)
- **Egress**: Unlimited FREE

### Paid Tier (If You Exceed Free)
- **Storage**: $0.015/GB/month
- **Class A Operations**: $4.50/million
- **Class B Operations**: $0.36/million
- **Egress**: FREE (this is huge!)

### Example Cost for 100 Users
- 100 users × 50 photos × 2MB = 10GB storage = **FREE**
- 5,000 uploads/month = **FREE**
- 50,000 downloads/month = **FREE**
- Bandwidth = **FREE**

**Total: $0/month** 🎉

Compare to AWS S3:
- Storage: $0.23/month
- Operations: $0.02/month
- Egress (10GB): $0.90/month
- **Total: $1.15/month**

---

## Alternative Storage Options

### Option 2: Backblaze B2
- **Free Tier**: 10GB storage, 1GB/day download
- **Pricing**: $0.005/GB storage (even cheaper!)
- **S3-Compatible**: Yes
- **Setup**: Similar to R2

### Option 3: DigitalOcean Spaces
- **Pricing**: $5/month (250GB + 1TB transfer)
- **S3-Compatible**: Yes
- **CDN Included**: Yes

### Option 4: Supabase Storage
- **Free Tier**: 1GB storage
- **Pricing**: $0.021/GB
- **Built-in Auth**: Yes
- **Not S3-compatible**: Requires different SDK

---

## Migration from AWS S3 (If Needed)

If you already have data in S3:

### Using AWS CLI
```bash
# Install AWS CLI
brew install awscli  # macOS
# or: apt-get install awscli  # Linux

# Configure for S3
aws configure

# Sync to R2
aws s3 sync s3://old-bucket s3://novo-family-photos \
  --endpoint-url https://your-account.r2.cloudflarestorage.com
```

### Using Cloudflare's Migration Tool
1. R2 dashboard → **Migrate data**
2. Enter S3 credentials
3. Select bucket to migrate
4. Click **Start migration**

---

## Troubleshooting

### "Access Denied" Error
- Check API token has **Object Read & Write** permissions
- Verify bucket name matches `.env`
- Ensure endpoint URL is correct

### "Bucket Not Found"
- Verify bucket name in `.env` matches R2 dashboard
- Check for typos in bucket name

### Upload Fails
- Check file size (R2 max: 5TB per object)
- Verify API token hasn't expired
- Check R2 free tier limits

### Can't See Uploaded Files
- Go to R2 dashboard → Your bucket
- Files are organized by path: `users/{userId}/family/{memberName}/photos/`

---

## Security Best Practices

1. **Never commit API keys** - Already in `.gitignore`
2. **Use separate tokens** for dev/production
3. **Set token expiration** for production
4. **Enable bucket versioning** (optional)
5. **Set up CORS** if accessing from browser directly

---

## Next Steps

1. ✅ Set up R2 account
2. ✅ Create bucket
3. ✅ Generate API token
4. ✅ Update `.env` file
5. ✅ Test photo upload
6. 🚀 Deploy to Render!

---

## Support

- **R2 Docs**: https://developers.cloudflare.com/r2/
- **R2 API Reference**: https://developers.cloudflare.com/r2/api/
- **Community**: https://community.cloudflare.com/

---

## Summary

Cloudflare R2 is the **best choice** for NoVo because:
- ✅ Free tier covers most use cases
- ✅ No bandwidth charges (huge savings!)
- ✅ S3-compatible (works with existing code)
- ✅ Fast global CDN
- ✅ Simple setup

**Total setup time: 5 minutes**
**Monthly cost: $0 (free tier)**

Perfect for NoVo! 🎉

