import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

// Cloudflare R2 configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'solchan-images'
const PUBLIC_URL = process.env.R2_PUBLIC_URL // e.g., https://pub-xyz.r2.dev

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name/path for the file in the bucket
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadToR2 = async (fileBuffer, fileName, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    })

    await r2Client.send(command)

    // Return the public URL
    const publicUrl = `${PUBLIC_URL}/${fileName}`
    console.log('✅ File uploaded to R2:', publicUrl)
    
    return publicUrl
  } catch (error) {
    console.error('❌ Error uploading to R2:', error)
    throw new Error('Failed to upload file to storage')
  }
}

/**
 * Upload a thread image to R2
 * @param {string} threadId - The thread ID
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - The public URL
 */
export const uploadThreadImage = async (threadId, fileBuffer, originalName, mimeType) => {
  const fileExt = originalName.split('.').pop()
  const fileName = `threads/${threadId}_${Date.now()}.${fileExt}`
  return await uploadToR2(fileBuffer, fileName, mimeType)
}

/**
 * Upload a reply image to R2
 * @param {string} replyId - The reply ID
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - The public URL
 */
export const uploadReplyImage = async (replyId, fileBuffer, originalName, mimeType) => {
  const fileExt = originalName.split('.').pop()
  const fileName = `replies/${replyId}_${Date.now()}.${fileExt}`
  return await uploadToR2(fileBuffer, fileName, mimeType)
}

/**
 * Upload a community image to R2
 * @param {string} communityId - The community ID
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - The public URL
 */
export const uploadCommunityImage = async (communityId, fileBuffer, originalName, mimeType) => {
  const fileExt = originalName.split('.').pop()
  const fileName = `communities/${communityId}_${Date.now()}.${fileExt}`
  return await uploadToR2(fileBuffer, fileName, mimeType)
}

export default {
  uploadToR2,
  uploadThreadImage,
  uploadReplyImage,
  uploadCommunityImage,
}

