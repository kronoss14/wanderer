import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a buffer to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export function uploadImage(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      folder: 'wanderer',
      resource_type: 'image',
      ...options
    };
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

export function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export default cloudinary;
