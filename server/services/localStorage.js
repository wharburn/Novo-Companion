import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directory - use env var for Render persistent disk, fallback to local
const STORAGE_DIR = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// Initialize storage on module load
ensureStorageDir();

// Upload family photo to local filesystem
export async function uploadFamilyPhoto(
  userId,
  memberName,
  fileBuffer,
  mimeType,
  description = ''
) {
  try {
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const relativePath = `users/${userId}/family/${memberName}/photos`;
    const fullDir = path.join(STORAGE_DIR, relativePath);

    // Create directory structure
    await fs.mkdir(fullDir, { recursive: true });

    // Save image file
    const filePath = path.join(fullDir, fileName);
    await fs.writeFile(filePath, fileBuffer);

    // Save metadata as JSON
    const metadataPath = path.join(fullDir, `${fileName}.meta.json`);
    const metadata = {
      description: description || 'No description',
      memberName: memberName,
      uploadedAt: new Date().toISOString(),
      mimeType: mimeType,
      size: fileBuffer.length,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const key = `${relativePath}/${fileName}`;
    const url = `/api/photos/serve/${encodeURIComponent(key)}`;

    console.log(`✅ Photo saved locally: ${key}`);

    return {
      success: true,
      url: url,
      key: key,
      description,
    };
  } catch (error) {
    console.error('Error uploading to local storage:', error);
    throw error;
  }
}

// Get photo file path (for serving)
export async function getPhotoPath(key) {
  try {
    const filePath = path.join(STORAGE_DIR, key);

    // Check if file exists
    await fs.access(filePath);

    return filePath;
  } catch (error) {
    console.error('Error getting photo path:', error);
    throw new Error('Photo not found');
  }
}

// List all photos for a family member (or all if memberName is null)
export async function listFamilyPhotos(userId, memberName) {
  try {
    const basePath = memberName
      ? path.join(STORAGE_DIR, `users/${userId}/family/${memberName}/photos`)
      : path.join(STORAGE_DIR, `users/${userId}/family`);

    // Check if directory exists
    try {
      await fs.access(basePath);
    } catch {
      return []; // Directory doesn't exist, return empty array
    }

    const photos = [];

    // Recursively find all photos
    async function scanDirectory(dir, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await scanDirectory(fullPath, relPath);
        } else if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
          // This is an image file
          const metadataPath = `${fullPath}.meta.json`;
          let metadata = {
            description: 'No description',
            memberName: 'Unknown',
            uploadedAt: new Date().toISOString(),
          };

          try {
            const metaContent = await fs.readFile(metadataPath, 'utf-8');
            metadata = JSON.parse(metaContent);
          } catch {
            // No metadata file, use defaults
          }

          const stats = await fs.stat(fullPath);
          const key = memberName
            ? `users/${userId}/family/${memberName}/photos/${relPath}`
            : `users/${userId}/family/${relPath}`;

          photos.push({
            key: key,
            url: `/api/photos/serve/${encodeURIComponent(key)}`,
            lastModified: stats.mtime,
            size: stats.size,
            description: metadata.description || 'No description',
            memberName: metadata.memberName || 'Unknown',
          });
        }
      }
    }

    await scanDirectory(basePath);

    return photos;
  } catch (error) {
    console.error('Error listing photos:', error);
    throw error;
  }
}

// Delete photo
export async function deletePhoto(key) {
  try {
    const filePath = path.join(STORAGE_DIR, key);
    const metadataPath = `${filePath}.meta.json`;

    // Delete image file
    await fs.unlink(filePath);

    // Delete metadata file if exists
    try {
      await fs.unlink(metadataPath);
    } catch {
      // Metadata file might not exist
    }

    console.log(`🗑️ Photo deleted: ${key}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

export default {
  uploadFamilyPhoto,
  getPhotoPath,
  listFamilyPhotos,
  deletePhoto,
};
