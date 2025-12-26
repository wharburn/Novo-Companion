# Render Persistent Disk Setup for Photo Storage

## 📦 What You Need

NoVo now uses **local filesystem storage** for photos instead of S3/Backblaze. On Render, you need to add a **Persistent Disk** to save photos across deployments.

---

## 🚀 Setup Steps on Render

### 1. Go to Your Render Service Dashboard
- Navigate to your NoVo web service on Render
- Click on your service name

### 2. Add Persistent Disk
- In the left sidebar, click **"Disks"**
- Click **"Add Disk"** button
- Configure the disk:
  - **Name**: `novo-photos` (or any name you prefer)
  - **Mount Path**: `/opt/render/project/storage`
  - **Size**: Start with **1 GB** (can increase later)
- Click **"Create"**

### 3. Add Environment Variable
- Go to **"Environment"** tab
- Add a new environment variable:
  - **Key**: `STORAGE_PATH`
  - **Value**: `/opt/render/project/storage`
- Click **"Save Changes"**

### 4. Verify Configuration
Make sure these environment variables are set:
```
USE_LOCAL_STORAGE=true
STORAGE_PATH=/opt/render/project/storage
```

### 5. Deploy
- Render will automatically redeploy with the new disk
- Photos will now be saved to persistent storage!

---

## 💰 Pricing

- **Persistent Disk**: ~$0.25/GB/month
- **1 GB disk**: ~$0.25/month (plenty for hundreds of photos)
- **10 GB disk**: ~$2.50/month (thousands of photos)

---

## ✅ How It Works

### Local Development
- Photos saved to `./storage/` directory
- Automatically created when first photo is uploaded
- Ignored by git (in `.gitignore`)

### Render Production
- Photos saved to `/opt/render/project/storage/` (persistent disk)
- Survives deployments and restarts
- Backed up by Render

### File Structure
```
storage/
└── users/
    └── {userId}/
        └── family/
            └── {memberName}/
                └── photos/
                    ├── abc123.jpeg
                    ├── abc123.jpeg.meta.json
                    ├── def456.jpeg
                    └── def456.jpeg.meta.json
```

---

## 🔄 Switching to S3/R2 Later (Optional)

If you want to switch to cloud storage later:

1. Set `USE_LOCAL_STORAGE=false` in environment variables
2. Add your S3/R2 credentials:
   ```
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   S3_BUCKET_NAME=your-bucket
   R2_ENDPOINT=your-endpoint (for R2/Backblaze)
   ```
3. Redeploy

---

## 📝 Notes

- **Disk is persistent**: Photos survive deployments
- **Backups**: Consider backing up the disk periodically
- **Migration**: If you switch to S3 later, you'll need to migrate existing photos
- **Local testing**: Works immediately without any setup

---

## 🆘 Troubleshooting

### Photos not saving?
1. Check Render logs for errors
2. Verify `STORAGE_PATH` environment variable is set
3. Verify disk is mounted at `/opt/render/project/storage`

### Disk full?
1. Go to Render dashboard → Disks
2. Increase disk size
3. Redeploy

### Want to see photos?
- Photos are served at: `/api/photos/serve/{key}`
- List all photos: `GET /api/photos/{userId}`

