# AWS Usage & Pricing Analysis - Al-Manhaj Radio
## Migration Planning Guide

**Date:** February 11, 2026  
**Current Account:** almanhaj-radio-audio (us-east-1)  
**Status:** Ready for migration to new AWS account

---

## 📊 Executive Summary

Your Al-Manhaj Radio system uses **minimal AWS services** with a **lean, cost-effective architecture**:

| Service | Usage | Monthly Cost | Notes |
|---------|-------|--------------|-------|
| **S3** | Audio storage | $0.50 - $2.00 | Primary AWS service |
| **EC2** | Gateway + Icecast | $7.50 | Separate infrastructure |
| **Data Transfer** | Outbound bandwidth | $0.50 - $5.00 | Listener downloads |
| **API Calls** | Minimal | ~$0.01 | Negligible |
| **Total AWS** | | **~$8.50 - $14.50/month** | Very cost-effective |

---

## 🔍 Current AWS Services in Use

### 1. Amazon S3 (Simple Storage Service)

**Purpose:** Audio file storage and retrieval

**Current Configuration:**
- **Bucket Name:** `almanhaj-radio-audio`
- **Region:** `us-east-1` (N. Virginia)
- **Storage Class:** Standard (default)
- **Versioning:** Not enabled
- **Encryption:** Default (SSE-S3)

**What's Stored:**
```
almanhaj-radio-audio/
├── originals/
│   ├── 2024/01/
│   │   ├── [recordingId]-original-filename.amr
│   │   ├── [recordingId]-original-filename.mp3
│   │   └── ...
│   └── 2024/02/
│       └── ...
└── playback/
    ├── 2024/01/
    │   ├── [recordingId].mp3
    │   └── ...
    └── 2024/02/
        └── ...
```

**S3 Operations:**
- **Upload:** Original audio files (AMR, MPEG, 3GP, WMA, etc.)
- **Download:** For audio conversion processing
- **Upload:** Converted MP3 files
- **Download:** For listener playback
- **Delete:** When removing audio from library

**Estimated Storage:**
- **Original files:** ~500 MB - 2 GB (depends on library size)
- **Converted MP3s:** ~300 MB - 1.5 GB (MP3 is smaller)
- **Total:** ~1-3 GB typical

**S3 Pricing Breakdown (us-east-1):**

| Item | Rate | Estimated Monthly |
|------|------|-------------------|
| Storage (1 GB) | $0.023/GB | $0.02 |
| Storage (2 GB) | $0.023/GB | $0.05 |
| Storage (3 GB) | $0.023/GB | $0.07 |
| PUT requests | $0.005 per 1,000 | $0.01 |
| GET requests | $0.0004 per 1,000 | $0.01 |
| Data transfer out | $0.09/GB | $0.50 - $5.00 |
| **Total S3** | | **$0.50 - $5.10/month** |

**Data Transfer Details:**
- Each listener download = 1 data transfer
- 100 listeners × 5 MB average = 500 MB = $0.045
- 1000 listeners × 5 MB average = 5 GB = $0.45
- 10,000 listeners × 5 MB average = 50 GB = $4.50

---

### 2. EC2 (Elastic Compute Cloud)

**Purpose:** Gateway server + Icecast streaming server

**Current Configuration:**
- **Instance Type:** t3.micro (assumed based on deployment guide)
- **Region:** us-east-1 (N. Virginia)
- **OS:** Ubuntu 20.04 LTS
- **Storage:** 20-30 GB EBS volume
- **Network:** Public IP (98.93.42.61)

**What Runs on EC2:**
```
EC2 Instance (98.93.42.61)
├── Icecast Server (Port 8000)
│   └── Streams audio to listeners
├── Gateway Service (Port 8080)
│   ├── WebSocket server for browser audio
│   ├── Audio conversion coordination
│   └── JWT authentication
└── System Services
    ├── PM2 (process manager)
    ├── Node.js runtime
    └── FFmpeg (audio conversion)
```

**EC2 Pricing (t3.micro):**

| Item | Rate | Monthly Cost |
|------|------|--------------|
| t3.micro compute | $0.0104/hour | $7.50 |
| EBS storage (20 GB) | $0.10/GB | $2.00 |
| Data transfer out | $0.09/GB | $0.50 - $5.00 |
| Elastic IP (if unused) | $0.005/hour | $3.60 |
| **Total EC2** | | **$13.60 - $18.10/month** |

**Note:** If Elastic IP is not attached to running instance, you're charged $3.60/month. Recommend releasing unused IPs.

**EC2 Capabilities:**
- ✅ Runs Icecast streaming server
- ✅ Runs Gateway (Node.js)
- ✅ Runs FFmpeg for audio conversion
- ✅ Handles WebSocket connections
- ✅ Manages JWT authentication
- ✅ Coordinates audio injection

---

### 3. Data Transfer (Bandwidth)

**Purpose:** Outbound data to listeners

**Current Usage:**
- **Listener downloads:** Audio files from S3
- **Stream data:** Icecast stream to listeners
- **API responses:** Minimal

**Data Transfer Pricing (us-east-1):**

| Destination | Rate | Notes |
|-------------|------|-------|
| Internet (first 1 GB) | Free | Free tier |
| Internet (1-10 TB) | $0.09/GB | Standard rate |
| CloudFront | $0.085/GB | If using CDN |
| EC2 to S3 | Free | Same region |

**Estimated Monthly Transfer:**
- 100 listeners × 5 MB = 500 MB = Free (within free tier)
- 1,000 listeners × 5 MB = 5 GB = $0.45
- 10,000 listeners × 5 MB = 50 GB = $4.50

---

### 4. Other AWS Services (NOT Used)

❌ **Not in use:**
- CloudFront (CDN)
- CloudWatch (monitoring)
- CloudWatch Logs (centralized logging)
- Lambda (serverless functions)
- RDS (managed database)
- DynamoDB (NoSQL)
- SNS/SQS (messaging)
- OpenSearch/Elasticsearch (search)
- Amplify (app hosting)
- Route 53 (DNS)

---

## 💰 Total Monthly AWS Cost Estimate

### Scenario 1: Small Deployment (100 listeners)
```
S3 Storage:           $0.05
S3 Requests:          $0.02
S3 Data Transfer:     $0.05
EC2 Compute:          $7.50
EC2 Storage:          $2.00
EC2 Data Transfer:    $0.05
─────────────────────────────
Total:                $9.67/month
```

### Scenario 2: Medium Deployment (1,000 listeners)
```
S3 Storage:           $0.10
S3 Requests:          $0.05
S3 Data Transfer:     $0.45
EC2 Compute:          $7.50
EC2 Storage:          $2.00
EC2 Data Transfer:    $0.45
─────────────────────────────
Total:                $10.55/month
```

### Scenario 3: Large Deployment (10,000 listeners)
```
S3 Storage:           $0.50
S3 Requests:          $0.10
S3 Data Transfer:     $4.50
EC2 Compute:          $7.50
EC2 Storage:          $2.00
EC2 Data Transfer:    $4.50
─────────────────────────────
Total:                $19.10/month
```

---

## 🔐 AWS Credentials & Access

### Current Setup
```
AWS Account ID: [Your Account ID]
Region: us-east-1 (N. Virginia)
S3 Bucket: almanhaj-radio-audio
EC2 Instance: 98.93.42.61
```

### Credentials in Use
**Environment Variables:**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[Your Access Key]
AWS_SECRET_ACCESS_KEY=[Your Secret Key]
AWS_S3_BUCKET=almanhaj-radio-audio
```

**Locations:**
- `.env.local` (local development)
- `gateway/.env` (gateway server)
- Vercel environment variables (production frontend)
- EC2 instance environment (production gateway)

---

## 📋 Migration Checklist

### Pre-Migration (Current Account)

- [ ] **Document current setup:**
  - [ ] S3 bucket name: `almanhaj-radio-audio`
  - [ ] S3 region: `us-east-1`
  - [ ] EC2 instance ID and IP
  - [ ] Current data volume in S3
  - [ ] Current monthly costs

- [ ] **Backup data:**
  - [ ] Export S3 bucket contents
  - [ ] Document all audio files
  - [ ] Export MongoDB data
  - [ ] Document EC2 configuration

- [ ] **Prepare credentials:**
  - [ ] Create new AWS account
  - [ ] Create IAM user for new account
  - [ ] Generate new access keys
  - [ ] Document new credentials securely

### Migration Steps

#### Step 1: Create New AWS Account
```
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow account creation wizard
4. Verify email and payment method
5. Complete account setup
```

#### Step 2: Create S3 Bucket in New Account
```bash
# Using AWS CLI in new account
aws s3 mb s3://almanhaj-radio-audio --region us-east-1

# Or use AWS Console:
# 1. Go to S3 console
# 2. Click "Create bucket"
# 3. Name: almanhaj-radio-audio
# 4. Region: us-east-1
# 5. Create
```

#### Step 3: Copy Data from Old to New S3
```bash
# Configure AWS CLI for old account
aws configure --profile old-account

# Configure AWS CLI for new account
aws configure --profile new-account

# Copy all data
aws s3 sync s3://almanhaj-radio-audio \
  s3://almanhaj-radio-audio \
  --source-profile old-account \
  --profile new-account \
  --region us-east-1
```

#### Step 4: Update Environment Variables

**In `.env.local`:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[NEW_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[NEW_SECRET_KEY]
AWS_S3_BUCKET=almanhaj-radio-audio
```

**In `gateway/.env`:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[NEW_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[NEW_SECRET_KEY]
AWS_S3_BUCKET=almanhaj-radio-audio
```

**In Vercel:**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[NEW_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[NEW_SECRET_KEY]
AWS_S3_BUCKET=almanhaj-radio-audio
```

**On EC2:**
```bash
ssh -i your-key.pem ubuntu@98.93.42.61
cd /opt/almanhaj-gateway-repo/gateway
nano .env
# Update credentials
pm2 restart almanhaj-gateway
```

#### Step 5: Test New Account
```bash
# Test S3 access
aws s3 ls s3://almanhaj-radio-audio --profile new-account

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://almanhaj-radio-audio/test.txt --profile new-account

# Test download
aws s3 cp s3://almanhaj-radio-audio/test.txt test-download.txt --profile new-account

# Verify
cat test-download.txt
```

#### Step 6: Verify Application Works
```
1. Test local development: npm run dev
2. Test file upload in admin panel
3. Test audio playback
4. Test live broadcasting
5. Test audio injection
```

#### Step 7: Update Production
```bash
# Update Vercel environment variables
# (via Vercel dashboard)

# Update EC2 gateway
ssh -i your-key.pem ubuntu@98.93.42.61
cd /opt/almanhaj-gateway-repo/gateway
nano .env
# Update credentials
pm2 restart almanhaj-gateway

# Verify production works
# Test at https://almanhaj.vercel.app
```

#### Step 8: Decommission Old Account
```
1. Delete old S3 bucket (after confirming new one works)
2. Terminate old EC2 instance (if migrating)
3. Delete old IAM users
4. Close old AWS account (optional)
```

---

## 🔒 Security Best Practices for Migration

### 1. IAM User Setup (New Account)
```bash
# Create IAM user for application
aws iam create-user --user-name almanhaj-radio-app

# Create access key
aws iam create-access-key --user-name almanhaj-radio-app

# Attach S3 policy
aws iam attach-user-policy \
  --user-name almanhaj-radio-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### 2. S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::NEW_ACCOUNT_ID:user/almanhaj-radio-app"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::almanhaj-radio-audio",
        "arn:aws:s3:::almanhaj-radio-audio/*"
      ]
    }
  ]
}
```

### 3. Credential Rotation
- Store credentials in `.env` files (not in code)
- Use environment variables in production
- Rotate credentials every 90 days
- Never commit credentials to Git

### 4. Monitoring
```bash
# Enable S3 access logging
aws s3api put-bucket-logging \
  --bucket almanhaj-radio-audio \
  --bucket-logging-status file://logging.json

# Enable CloudTrail (optional)
aws cloudtrail create-trail \
  --name almanhaj-radio-trail \
  --s3-bucket-name almanhaj-radio-logs
```

---

## 📈 Cost Optimization Tips

### 1. S3 Optimization
- ✅ Use S3 Standard (already doing this)
- ✅ Enable versioning only if needed
- ✅ Use lifecycle policies to archive old files
- ✅ Consider S3 Intelligent-Tiering for variable access

### 2. EC2 Optimization
- ✅ Use t3.micro (already doing this)
- ✅ Release unused Elastic IPs ($3.60/month savings)
- ✅ Use Reserved Instances for 30-40% savings (if committed)
- ✅ Monitor CPU usage and downsize if needed

### 3. Data Transfer Optimization
- ✅ Use CloudFront CDN for listener downloads ($0.085/GB vs $0.09/GB)
- ✅ Compress audio files (MP3 is already compressed)
- ✅ Use S3 Transfer Acceleration (if needed)
- ✅ Keep EC2 and S3 in same region (already doing this)

### 4. Monitoring & Alerts
```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

---

## 🚀 Post-Migration Verification

### Checklist
- [ ] S3 bucket accessible from new account
- [ ] All audio files copied successfully
- [ ] Local development works with new credentials
- [ ] Vercel deployment works with new credentials
- [ ] EC2 gateway works with new credentials
- [ ] File uploads work in admin panel
- [ ] Audio playback works for listeners
- [ ] Live broadcasting works
- [ ] Audio injection works
- [ ] No errors in logs
- [ ] Performance is same or better

### Testing Commands
```bash
# Test S3 access
aws s3 ls s3://almanhaj-radio-audio

# Test upload
aws s3 cp test-file.mp3 s3://almanhaj-radio-audio/test.mp3

# Test download
aws s3 cp s3://almanhaj-radio-audio/test.mp3 test-download.mp3

# Verify file
ls -lh test-download.mp3
```

---

## 📞 Support & Documentation

### AWS Documentation
- [S3 Documentation](https://docs.aws.amazon.com/s3/)
- [EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [AWS Pricing Calculator](https://calculator.aws/)

### Your Application Documentation
- See `PRODUCTION_DEPLOYMENT_GUIDE.md` for deployment steps
- See `EC2_DEPLOYMENT_SAFE.md` for EC2 setup
- See `VERCEL_ENV_SETUP_SAFE.md` for Vercel configuration

---

## 🎯 Summary

**Your AWS usage is minimal and cost-effective:**
- ✅ Only S3 and EC2 in use
- ✅ ~$10-20/month total cost
- ✅ Highly scalable architecture
- ✅ Easy to migrate to new account
- ✅ No complex services to migrate

**Migration is straightforward:**
1. Create new AWS account
2. Create S3 bucket
3. Copy data
4. Update credentials
5. Test and verify
6. Decommission old account

**No hidden costs or complex services to worry about.**
