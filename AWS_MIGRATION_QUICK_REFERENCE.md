# AWS Migration Quick Reference
## Al-Manhaj Radio - New Account Setup

---

## 🎯 What You're Migrating

| Component | Current | New Account |
|-----------|---------|-------------|
| **S3 Bucket** | almanhaj-radio-audio | almanhaj-radio-audio |
| **Region** | us-east-1 | us-east-1 |
| **Audio Files** | ~1-3 GB | Copy all files |
| **Access Keys** | Old credentials | New credentials |

---

## ⚡ Quick Migration (30 minutes)

### 1. Create New AWS Account (5 min)
```
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Enter email, password, account name
4. Verify email
5. Add payment method
6. Complete setup
```

### 2. Create S3 Bucket (2 min)
```bash
# Option A: AWS Console
# 1. Go to S3 console
# 2. Click "Create bucket"
# 3. Name: almanhaj-radio-audio
# 4. Region: us-east-1
# 5. Click "Create"

# Option B: AWS CLI
aws s3 mb s3://almanhaj-radio-audio --region us-east-1
```

### 3. Copy Audio Files (10 min)
```bash
# Install AWS CLI if needed
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Configure old account
aws configure --profile old
# Enter: Old Access Key ID
# Enter: Old Secret Access Key
# Region: us-east-1

# Configure new account
aws configure --profile new
# Enter: New Access Key ID
# Enter: New Secret Access Key
# Region: us-east-1

# Copy all files
aws s3 sync s3://almanhaj-radio-audio s3://almanhaj-radio-audio \
  --source-profile old \
  --profile new \
  --region us-east-1

# Verify copy
aws s3 ls s3://almanhaj-radio-audio --profile new
```

### 4. Update Credentials (5 min)

**Local Development (.env.local):**
```env
AWS_ACCESS_KEY_ID=NEW_KEY_HERE
AWS_SECRET_ACCESS_KEY=NEW_SECRET_HERE
AWS_REGION=us-east-1
AWS_S3_BUCKET=almanhaj-radio-audio
```

**Gateway Server (gateway/.env):**
```env
AWS_ACCESS_KEY_ID=NEW_KEY_HERE
AWS_SECRET_ACCESS_KEY=NEW_SECRET_HERE
AWS_REGION=us-east-1
AWS_S3_BUCKET=almanhaj-radio-audio
```

**Vercel (via Dashboard):**
```
1. Go to https://vercel.com/dashboard
2. Select project: almanhaj-radio
3. Settings → Environment Variables
4. Update:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION
   - AWS_S3_BUCKET
5. Save
```

**EC2 Gateway:**
```bash
ssh -i your-key.pem ubuntu@98.93.42.61
cd /opt/almanhaj-gateway-repo/gateway
nano .env
# Update credentials
pm2 restart almanhaj-gateway
```

### 5. Test Everything (8 min)
```bash
# Test local
npm run dev
# Try uploading a file in admin panel

# Test production
# Visit https://almanhaj.vercel.app
# Try uploading a file
# Try playing audio

# Test gateway
curl http://98.93.42.61:8080/health
```

---

## 📋 Credentials Needed

### From Old Account
```
AWS_ACCESS_KEY_ID=[OLD_KEY]
AWS_SECRET_ACCESS_KEY=[OLD_SECRET]
```

### For New Account
```
AWS_ACCESS_KEY_ID=[NEW_KEY]
AWS_SECRET_ACCESS_KEY=[NEW_SECRET]
```

**How to get new credentials:**
1. Go to AWS Console
2. Click your account name (top right)
3. Select "Security credentials"
4. Click "Create access key"
5. Copy Access Key ID and Secret Access Key
6. Save securely (you can only see secret once!)

---

## 🔍 Verification Checklist

After migration, verify:

- [ ] S3 bucket exists in new account
- [ ] All audio files copied (check file count)
- [ ] Local development works (`npm run dev`)
- [ ] Can upload files in admin panel
- [ ] Can play audio files
- [ ] Vercel deployment works
- [ ] EC2 gateway is running
- [ ] Live broadcasting works
- [ ] No errors in logs

---

## 🚨 Troubleshooting

### "Access Denied" Error
```
Problem: Credentials are wrong or don't have S3 access
Solution:
1. Verify credentials in .env file
2. Check IAM user has S3 permissions
3. Verify bucket name is correct
```

### "Bucket not found"
```
Problem: Bucket doesn't exist in new account
Solution:
1. Create bucket: aws s3 mb s3://almanhaj-radio-audio
2. Verify bucket exists: aws s3 ls
3. Check region is us-east-1
```

### "Files not copied"
```
Problem: Sync command failed
Solution:
1. Check both profiles are configured: aws configure list
2. Verify old account has files: aws s3 ls s3://almanhaj-radio-audio --profile old
3. Try sync again with verbose: aws s3 sync ... --debug
```

### "Upload still fails after migration"
```
Problem: Application still using old credentials
Solution:
1. Verify .env files are updated
2. Restart local dev: npm run dev
3. Redeploy Vercel: git push origin main
4. Restart EC2 gateway: pm2 restart almanhaj-gateway
5. Check logs for errors
```

---

## 📊 Cost Comparison

### Old Account (Monthly)
```
S3 Storage:        $0.05
S3 Requests:       $0.02
S3 Data Transfer:  $0.50
EC2 Compute:       $7.50
EC2 Storage:       $2.00
EC2 Data Transfer: $0.50
─────────────────────────
Total:             $10.57
```

### New Account (Monthly)
```
Same as above - costs don't change!
$10.57/month
```

**Note:** You'll have both accounts for a few days during migration. After verification, you can delete the old account.

---

## 🔐 Security Checklist

- [ ] New credentials stored securely (not in Git)
- [ ] Old credentials revoked in old account
- [ ] S3 bucket has proper permissions
- [ ] IAM user created with minimal permissions
- [ ] No credentials in code or logs
- [ ] Environment variables set in all locations

---

## 📞 Need Help?

### AWS Resources
- [AWS Support](https://console.aws.amazon.com/support/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS CLI Help](https://docs.aws.amazon.com/cli/)

### Your Application
- See `AWS_USAGE_AND_PRICING_ANALYSIS.md` for detailed info
- See `PRODUCTION_DEPLOYMENT_GUIDE.md` for deployment
- See `EC2_DEPLOYMENT_SAFE.md` for EC2 setup

---

## ✅ You're Done!

After completing these steps, your application will be running on the new AWS account with:
- ✅ All audio files migrated
- ✅ Same functionality
- ✅ Same cost
- ✅ Same performance
- ✅ Ready for production

**Total time: ~30 minutes**
