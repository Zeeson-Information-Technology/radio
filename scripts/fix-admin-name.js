/**
 * Fix Admin User Name Field (JavaScript version)
 * Adds name field to existing admin users who don't have it
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://radio_user:okBJKJbtUS2KCTLE@cluster0.uiauf9o.mongodb.net/online-radio?retryWrites=true&w=majority';

// AdminUser schema (simplified)
const AdminUserSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  mustChangePassword: Boolean,
  createdBy: mongoose.Schema.Types.ObjectId,
  lastLoginAt: Date,
  createdAt: Date,
});

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

async function fixAdminNames() {
  try {
    console.log('🔧 Connecting to database...');
    await mongoose.connect(MONGODB_URI);

    // Find all admin users without a name field
    const usersWithoutName = await AdminUser.find({
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' }
      ]
    });

    console.log(`📋 Found ${usersWithoutName.length} users without names`);

    for (const user of usersWithoutName) {
      // Generate a name from email or use Ibrahim for superadmin
      let nameFromEmail;
      if (user.role === 'super_admin' || user.email.includes('ibrahim')) {
        nameFromEmail = 'Ibrahim';
      } else {
        nameFromEmail = user.email.split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }

      // Update the user
      await AdminUser.findByIdAndUpdate(user._id, {
        name: nameFromEmail
      });

      console.log(`✅ Updated ${user.email} with name: "${nameFromEmail}"`);
    }

    console.log('🎉 All admin users now have names!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing admin names:', error);
    process.exit(1);
  }
}

// Run the migration
fixAdminNames();