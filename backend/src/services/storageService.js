import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if R2 is configured
const isR2Configured = !!(process.env.R2_ENDPOINT_URL && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)

let r2Client = null
if (isR2Configured) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  console.log('  R2 storage configured')
} else {
  console.log(' Using local file storage (R2 not configured)')
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'cointalk-images'
const PUBLIC_URL = process.env.R2_PUBLIC_URL
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads')

// Ensure local upload directory exists
if (!isR2Configured) {
  const dirs = ['communities', 'threads', 'replies']
  for (const dir of dirs) {
    const fullPath = path.join(LOCAL_UPLOAD_DIR, dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }
  }
}

/**
 * Upload a file — to R2 if configured, otherwise local filesystem
 */
export const uploadToR2 = async (fileBuffer, fileName, contentType) => {
  if (isR2Configured && r2Client) {
    // Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    })

    await r2Client.send(command)
    const publicUrl = `${PUBLIC_URL}/${fileName}`
    console.log(' Uploaded to R2:', publicUrl)
    return publicUrl
  } else {
    // Save to local filesystem
    const localPath = path.join(LOCAL_UPLOAD_DIR, fileName)
    const dir = path.dirname(localPath)
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(localPath, fileBuffer)
    
    // Return URL path that Express will serve statically
    const localUrl = `/uploads/${fileName}`
    console.log(' Saved locally:', localUrl)
    return localUrl
  }
}

/**
 * Upload a thread image
 */
export const uploadThreadImage = async (threadId, fileBuffer, originalName, mimeType) => {
  const fileExt = originalName.split('.').pop()
  const fileName = `threads/${threadId}_${Date.now()}.${fileExt}`
  return await uploadToR2(fileBuffer, fileName, mimeType)
}

/**
 * Upload a reply image
 */
export const uploadReplyImage = async (replyId, fileBuffer, originalName, mimeType) => {
  const fileExt = originalName.split('.').pop()
  const fileName = `replies/${replyId}_${Date.now()}.${fileExt}`
  return await uploadToR2(fileBuffer, fileName, mimeType)
}

/**
 * Upload a community image
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
