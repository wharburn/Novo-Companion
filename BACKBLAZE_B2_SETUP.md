# Backblaze B2 Setup Guide

## ✅ You've Got Your Credentials!

Now let's configure them in the app.

---

## Step 1: Find Your Credentials

You should have received from Backblaze:

1. **keyID** - Looks like: `005a1b2c3d4e5f6g7h8i9`
2. **applicationKey** - Looks like: `K005abcdefghijklmnopqrstuvwxyz1234567890`
3. **Endpoint** - Looks like: `s3.us-west-004.backblazeb2.com`
4. **Bucket Name** - What you named it (e.g., `novo-family-photos`)

---

## Step 2: Update Your `.env` File

Open `novo-app/.env` and update these lines (around line 25-39):

```env
# Photo Storage - Backblaze B2 (S3-compatible)
AWS_ACCESS_KEY_ID=005a1b2c3d4e5f6g7h8i9
AWS_SECRET_ACCESS_KEY=K005abcdefghijklmnopqrstuvwxyz1234567890
AWS_REGION=us-west-004
S3_BUCKET_NAME=novo-family-photos
R2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

**Replace with YOUR actual values:**
- `AWS_ACCESS_KEY_ID` = Your **keyID**
- `AWS_SECRET_ACCESS_KEY` = Your **applicationKey**
- `AWS_REGION` = Extract from endpoint (e.g., `us-west-004`)
- `S3_BUCKET_NAME` = Your bucket name
- `R2_ENDPOINT` = Your full endpoint URL with `https://`

---

## Step 3: Find Your Region Code

Your region is in the endpoint URL:

| Endpoint | Region Code |
|----------|-------------|
| `s3.us-west-000.backblazeb2.com` | `us-west-000` |
| `s3.us-west-001.backblazeb2.com` | `us-west-001` |
| `s3.us-west-002.backblazeb2.com` | `us-west-002` |
| `s3.us-west-004.backblazeb2.com` | `us-west-004` |
| `s3.eu-central-003.backblazeb2.com` | `eu-central-003` |

---

## Step 4: Example Configuration

Here's a complete example:

```env
# Photo Storage - Backblaze B2
AWS_ACCESS_KEY_ID=005f1a2b3c4d5e6f7g8h9
AWS_SECRET_ACCESS_KEY=K005abcXYZ123456789qrstuvwxyz0987654321
AWS_REGION=us-west-004
S3_BUCKET_NAME=novo-family-photos
R2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

---

## Step 5: Test the Configuration

### Start the Development Server

```bash
cd novo-app
npm install  # If you haven't already
npm run dev
```

### Test Photo Upload

1. Open http://localhost:5173
2. Click **Family** tab
3. Click **Add Family Member**
4. Fill in details (e.g., Name: "Grandma", Relationship: "Grandmother")
5. Click **Save**
6. Click **Upload Photo** for that member
7. Select an image file
8. Click **Upload**

✅ If successful, you'll see the photo appear!

---

## Step 6: Verify in Backblaze Dashboard

1. Go to https://secure.backblaze.com/b2_buckets.htm
2. Click your bucket name (`novo-family-photos`)
3. You should see uploaded files in this structure:
   ```
   users/
     user123/
       family/
         Grandma/
           photos/
             abc123-photo.jpg
   ```

---

## Troubleshooting

### Error: "Access Denied"

**Cause**: Wrong credentials or permissions

**Fix**:
1. Go to https://secure.backblaze.com/app_keys.htm
2. Verify your keyID and applicationKey
3. Make sure the key has **Read and Write** access
4. Check bucket name matches exactly

### Error: "Bucket Not Found"

**Cause**: Bucket name mismatch

**Fix**:
1. Go to https://secure.backblaze.com/b2_buckets.htm
2. Copy the exact bucket name
3. Update `S3_BUCKET_NAME` in `.env`

### Error: "Invalid Endpoint"

**Cause**: Wrong endpoint URL or region

**Fix**:
1. Check your bucket's endpoint in Backblaze dashboard
2. Make sure `R2_ENDPOINT` includes `https://`
3. Verify `AWS_REGION` matches the endpoint

### Photos Upload But Don't Display

**Cause**: Signed URL generation issue

**Fix**:
1. Check browser console for errors
2. Verify endpoint URL is correct
3. Make sure bucket is set to **Private** (not Public)

---

## Backblaze B2 Free Tier Limits

- **Storage**: 10 GB
- **Downloads**: 1 GB/day (30 GB/month)
- **Class B Transactions**: 2,500/day (downloads)
- **Class C Transactions**: 2,500/day (deletes)

### What This Means for NoVo

- **~5,000 photos** (at 2MB each)
- **~500 photo views/day** (at 2MB each)
- Perfect for personal use or small deployments!

---

## Paid Pricing (If You Exceed Free Tier)

- **Storage**: $0.005/GB/month (cheapest!)
- **Downloads**: $0.01/GB
- **Uploads**: FREE

### Example: 100 Users

- 100 users × 50 photos × 2MB = 10GB storage = **FREE**
- 5,000 downloads/month × 2MB = 10GB = $0.10
- **Total: $0.10/month** 🎉

---

## Security Best Practices

1. ✅ **Never commit `.env` to Git** (already in `.gitignore`)
2. ✅ **Use application keys** (not master key)
3. ✅ **Limit key permissions** to specific bucket
4. ✅ **Set key expiration** for production (optional)
5. ✅ **Enable bucket encryption** (already enabled)

---

## Next Steps

1. ✅ Update `.env` with your Backblaze credentials
2. ✅ Test photo upload locally
3. ✅ Set up other services (Upstash, OpenAI)
4. 🚀 Deploy to Render!

---

## Backblaze B2 Resources

- **Dashboard**: https://secure.backblaze.com/b2_buckets.htm
- **App Keys**: https://secure.backblaze.com/app_keys.htm
- **Documentation**: https://www.backblaze.com/b2/docs/
- **S3 Compatibility**: https://www.backblaze.com/b2/docs/s3_compatible_api.html

---

## Need Help?

If you're still having issues:

1. Check the error message in browser console
2. Check server logs: `npm run dev` output
3. Verify all credentials are correct
4. Make sure bucket exists and is accessible

---

## Summary

✅ Backblaze B2 is configured!
✅ S3-compatible (works with our code)
✅ Free tier: 10GB storage
✅ Cheapest option: $0.005/GB
✅ Easy to use

You're all set! 🎉

