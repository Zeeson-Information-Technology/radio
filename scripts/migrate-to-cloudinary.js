/**
 * Migration Script: DigitalOcean Spaces → Cloudinary
 * 
 * Downloads all audio files from DigitalOcean Spaces CDN and uploads
 * them to Cloudinary, then updates each MongoDB record to use
 * Cloudinary as the preferred storage.
 *
 * Usage:
 *   node scripts/migrate-to-cloudinary.js
 *
 * Requirements:
 *   - MongoDB connection string in .env.local (MONGODB_URI)
 *   - Cloudinary credentials in .env.local
 *   - DigitalOcean Spaces credentials in .env.local
 *
 * Safe to re-run — skips files that already have cloudinaryUrl set.
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// MongoDB AudioRecording schema (minimal — just what we need)
const AudioRecordingSchema = new mongoose.Schema({
  title: String,
  storageKey: String,
  storageUrl: String,
  cdnUrl: String,
  playbackUrl: String,
  cloudinaryUrl: { type: String, default: null },
  cloudinaryPublicId: { type: String, default: null },
  preferredStorage: { type: String, default: 'digitalocean' },
  conversionStatus: { type: String, default: 'ready' },
  format: String,
  playbackFormat: { type: String, default: 'mp3' },
  status: { type: String, default: 'active' },
});

const AudioRecording =
  mongoose.models.AudioRecording ||
  mongoose.model('AudioRecording', AudioRecordingSchema);

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the DigitalOcean Spaces CDN URL for a recording.
 */
function getDigitalOceanUrl(recording) {
  const region = process.env.AWS_REGION || 'lon1';
  const bucket = process.env.AWS_S3_BUCKET || 'almanhaj-radio';

  // Try playbackUrl first (converted MP3), then storageKey, then storageUrl
  const sourceKey =
    recording.playbackUrl
      ? recording.playbackUrl.split('.amazonaws.com/')[1] ||
        recording.playbackUrl.split('.digitaloceanspaces.com/')[1]
      : null;

  const key = sourceKey || recording.storageKey;
  if (!key) return recording.storageUrl || recording.playbackUrl || null;

  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${key}`;
}

/**
 * Download a file from a URL as a Buffer.
 */
async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload a Buffer to Cloudinary as a video resource (100MB limit vs 10MB for raw).
 */
async function uploadToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'video', // 'video' = 100MB limit, 'raw' = 10MB
        media_metadata: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            bytes: result.bytes,
          });
        }
      }
    );
    stream.end(buffer);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Starting migration: DigitalOcean Spaces → Cloudinary\n');

  // Validate config
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(1);
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('❌ CLOUDINARY_CLOUD_NAME not set in .env.local');
    process.exit(1);
  }

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find all recordings that still use DigitalOcean
  const recordings = await AudioRecording.find({
    status: 'active',
    preferredStorage: { $ne: 'cloudinary' },
  }).lean();

  console.log(`📋 Found ${recordings.length} recordings to migrate\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;
  let failedItems = [];

  for (let i = 0; i < recordings.length; i++) {
    const rec = recordings[i];
    const progress = `[${i + 1}/${recordings.length}]`;

    // Skip if already migrated
    if (rec.cloudinaryUrl && rec.preferredStorage === 'cloudinary') {
      console.log(`${progress} ⏭️  Already migrated: ${rec.title}`);
      skipped++;
      continue;
    }

    const doUrl = getDigitalOceanUrl(rec);
    if (!doUrl) {
      console.log(`${progress} ❌ No URL found: ${rec.title}`);
      failed++;
      failedItems.push({ id: rec._id, title: rec.title, reason: 'No DO URL' });
      continue;
    }

    try {
      console.log(`${progress} ⬇️  Downloading: ${rec.title}`);

      const buffer = await downloadFile(doUrl);
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
      console.log(`${progress} 📦 Downloaded ${sizeMB}MB`);

      // Generate public ID
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const sanitized = rec.title
        ? rec.title.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50)
        : 'untitled';
      const publicId = `almanhaj-radio/${year}/${month}/${rec._id}`;

      console.log(`${progress} ☁️  Uploading to Cloudinary...`);
      const result = await uploadToCloudinary(buffer, publicId);

      console.log(`${progress} ✅ Uploaded: ${result.secureUrl}`);

      // Update MongoDB record
      await AudioRecording.findByIdAndUpdate(rec._id, {
        cloudinaryUrl: result.secureUrl,
        cloudinaryPublicId: result.publicId,
        preferredStorage: 'cloudinary',
      });

      console.log(`${progress} 💾 MongoDB updated\n`);
      success++;
    } catch (err) {
      console.error(`${progress} ❌ Failed: ${rec.title} — ${err.message}\n`);
      failed++;
      failedItems.push({ id: rec._id, title: rec.title, reason: err.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Migrated: ${success}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);

  if (failedItems.length > 0) {
    console.log('\nFailed items:');
    failedItems.forEach(item => {
      console.log(`  - ${item.title} (${item.id}): ${item.reason}`);
    });
  }

  console.log('\n🎉 Migration complete!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
