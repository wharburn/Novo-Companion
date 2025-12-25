import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure S3 or R2 (R2 is S3-compatible)
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'auto',
};

// If using Cloudflare R2, add custom endpoint
if (process.env.R2_ENDPOINT) {
  s3Config.endpoint = process.env.R2_ENDPOINT;
  s3Config.signatureVersion = 'v4';
}

const s3 = new AWS.S3(s3Config);

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Upload family photo
export async function uploadFamilyPhoto(userId, memberName, fileBuffer, mimeType) {
  try {
    const fileExtension = mimeType.split('/')[1];
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `users/${userId}/family/${memberName}/photos/${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    };

    const result = await s3.upload(params).promise();

    return {
      success: true,
      url: result.Location,
      key: result.Key,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

// Get signed URL for private photo access
export async function getSignedPhotoUrl(key, expiresIn = 3600) {
  try {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

// List all photos for a family member
export async function listFamilyPhotos(userId, memberName) {
  try {
    const prefix = `users/${userId}/family/${memberName}/photos/`;

    const params = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const result = await s3.listObjectsV2(params).promise();

    const photos = await Promise.all(
      result.Contents.map(async (item) => ({
        key: item.Key,
        url: await getSignedPhotoUrl(item.Key),
        lastModified: item.LastModified,
        size: item.Size,
      }))
    );

    return photos;
  } catch (error) {
    console.error('Error listing photos:', error);
    throw error;
  }
}

// Delete photo
export async function deletePhoto(key) {
  try {
    await s3
      .deleteObject({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      .promise();

    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

export default {
  uploadFamilyPhoto,
  getSignedPhotoUrl,
  listFamilyPhotos,
  deletePhoto,
};
