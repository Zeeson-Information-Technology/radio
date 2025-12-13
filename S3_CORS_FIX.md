# S3 CORS Configuration for Audio Playback

## Problem

When trying to play audio files from S3, you get this error:

```
Access to audio at 'https://almanhaj-radio-audio.s3.amazonaws.com/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This happens because:
1. The browser is trying to load audio from S3 directly
2. S3 doesn't have CORS headers configured by default
3. The browser blocks the request for security reasons

## Solution 1: Automatic Fix (Recommended)

Run the CORS fix script:

```bash
chmod +x fix-s3-cors.sh
./fix-s3-cors.sh
```

## Solution 2: Manual AWS CLI

Configure CORS using AWS CLI:

```bash
aws s3api put-bucket-cors \
    --bucket almanhaj-radio-audio \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3600
            }
        ]
    }'
```

## Solution 3: AWS Console (Manual)

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click on your bucket: `almanhaj-radio-audio`
3. Go to **Permissions** tab
4. Scroll down to **Cross-origin resource sharing (CORS)**
5. Click **Edit**
6. Paste this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
    }
]
```

7. Click **Save changes**

## Verify CORS Configuration

Test if CORS is working:

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://almanhaj-radio-audio.s3.amazonaws.com/
```

You should see headers like:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Max-Age: 3600
```

## Alternative: Use Signed URLs (Already Implemented)

The app now generates signed URLs which bypass CORS issues:
- Signed URLs include authentication in the URL
- They work from any origin
- They expire after 1 hour for security

## Troubleshooting

### Still Getting CORS Errors

1. **Check bucket name**: Make sure it's `almanhaj-radio-audio`
2. **Verify AWS credentials**: Ensure your AWS CLI is configured
3. **Wait for propagation**: CORS changes can take a few minutes
4. **Clear browser cache**: Hard refresh (Ctrl+F5) to clear cached CORS responses

### CORS Configuration Not Saving

1. **Check permissions**: Ensure your AWS user has `s3:PutBucketCORS` permission
2. **Verify JSON format**: Make sure the CORS configuration JSON is valid
3. **Check bucket ownership**: Ensure you own the bucket

### Audio Still Not Playing

1. **Check file format**: AMR files may not be supported by all browsers
2. **Verify file exists**: Check if the file exists in S3
3. **Test signed URLs**: The app should generate signed URLs automatically
4. **Check browser console**: Look for other error messages

## Security Notes

- **AllowedOrigins: "*"** allows access from any domain
- For production, consider restricting to your domain: `["https://yourdomain.com"]`
- **MaxAgeSeconds: 3600** caches CORS preflight for 1 hour
- **ExposeHeaders** allows JavaScript to read ETag headers

---

**Last Updated:** December 13, 2025