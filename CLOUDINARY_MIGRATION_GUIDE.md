# Cloudinary Migration Guide

## Overview
This guide documents the migration from AWS S3 (closed account) to Cloudinary for audio file storage, with redundancy through DigitalOcean Spaces during the transition period.

## Why Cloudinary?
- **Free Forever:** 25GB/month free tier, no credit card required
- **No Account Closure Risk:** Free tier is indefinite (not trial-based)
- **Nigerian-Friendly:** Accessible globally, accepts PayPal if you exceed free tier
- **CDN Included:** Automatic delivery optimization
- **Audio Support:** Duration metadata extraction, transformations
- **Sufficient for Community Radio:** 25GB/month ÷ 15MB per file = 1,666 files/month max

## Cost Comparison (Annual)
- **Old Setup:** ₦217,800/year (AWS $5 + DigitalOcean $11/mo)
- **New Setup:** ₦118,800/year (DigitalOcean $6/mo + free Cloudinary + Vercel free)
- **Savings:** ₦99,000/year (~45% reduction)

## Migration Timeline

### Phase 1: Setup (Now)
1. Create free Cloudinary account at https://cloudinary.com
2. Get cloud name, API key, and secret from dashboard
3. Add credentials to `.env.local` and `.env.example`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Install cloudinary package: `npm install cloudinary`

### Phase 2: Dual Upload (Oct 17 - whenever)
- New uploads go to **both Cloudinary (primary) and DigitalOcean Spaces (backup)**
- If Cloudinary fails, automatically falls back to Spaces
- If Cloudinary succeeds, attempt Spaces upload for redundancy
- This provides safety during transition

### Phase 3: Cleanup (After Oct 17)
- DigitalOcean credits expire: Oct 17, 2026
- Delete DigitalOcean Spaces ($5/mo savings)
- Update upload route to use Cloudinary exclusively
- Keep DigitalOcean Droplet ($6/mo) for gateway (irreplaceable for live radio)

### Phase 4: Keep Running (Indefinite)
- **Final Monthly Cost:** ₦9,900/mo (DigitalOcean Droplet only)
- Cloudinary free tier covers all file storage needs
- Vercel free tier covers frontend

## Setup Instructions

### Step 1: Create Cloudinary Account
1. Visit https://cloudinary.com/users/register/free
2. Sign up (no credit card required)
3. Verify email

### Step 2: Get API Credentials
1. Go to https://dashboard.cloudinary.com/settings/api
2. Copy:
   - Cloud Name
   - API Key
   - API Secret

### Step 3: Update Environment
1. Edit `.env.local`:
   ```bash
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. Run: `npm install`

### Step 4: Test Upload
1. Log in to admin panel
2. Upload a test audio file
3. Check browser console for "Cloudinary upload completed"
4. Verify file appears in Cloudinary dashboard: https://dashboard.cloudinary.com/media

## Current File Structure

### New Services
- `lib/services/cloudinary.ts` - Cloudinary upload/delete logic
- `lib/services/s3.ts` - AWS S3 (kept for redundancy)

### Updated Files
- `app/api/audio/upload/route.ts` - Dual upload logic
- `.env.local` - Cloudinary credentials
- `.env.example` - Updated template
- `gateway/.env` - Added Cloudinary fields
- `package.json` - Added cloudinary dependency

## Important Notes

### Cloudinary Free Tier Limits
- 25GB/month bandwidth
- 25GB/month storage (rolling)
- Unlimited transformations
- 1,000 files/month storage additions (soft limit)

### If You Exceed Free Tier
- Charges are pay-as-you-go (~$0.10 per GB)
- For community radio with ~150 files/month (2.25GB), you won't exceed
- Easy to upgrade to $25/mo plan if needed

### Old AWS Account
- Old credentials in `.env.local` are from closed AWS account
- Kept for historical reference only
- Will not work for new uploads
- Can be removed after Oct 17

## Troubleshooting

### "Cloudinary is not configured"
- Verify `.env.local` has all three Cloudinary fields
- Restart dev server after updating env
- Check dashboard is accessible: https://dashboard.cloudinary.com

### Upload succeeds but file not appearing
- Check Cloudinary dashboard under Media tab
- Check browser network tab for upload response
- Verify free tier hasn't been exceeded (25GB)

### S3 upload failing
- Old AWS account is closed, this is expected
- Cloudinary primary should succeed
- Both failing means check storage service status

## Next Steps After Oct 17

When DigitalOcean credits expire:

1. **Option A: Keep Droplet** ($6/mo)
   - Best for live radio with persistent gateway
   - Delete Spaces to save $5/mo
   - Update upload route to Cloudinary-only

2. **Option B: Migrate Gateway** (explore after Oct 17)
   - Research Railway, Render alternatives
   - Droplet is optimal for now ($6/mo is cheapest WebSocket+FFmpeg option)
   - Complex migration with 10-20 hours effort

## References
- Cloudinary API: https://cloudinary.com/documentation/admin_api
- Pricing: https://cloudinary.com/pricing
- Dashboard: https://dashboard.cloudinary.com/console

## Questions?
Review infrastructure decision doc: See context from previous conversation about why DigitalOcean Droplet is kept for gateway (WebSocket, FFmpeg, persistent 24/7 connections required).
