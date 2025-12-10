/**
 * Fix Admin User Name Field
 * Adds name field to existing admin users who don't have it
 */

import { connectDB } from '../lib/db';
import AdminUser from '../lib/models/AdminUser';

async function fixAdminNames() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();

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
      // Generate a name from email (before @ symbol)
      const nameFromEmail = user.email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      // Update the user
      await AdminUser.findByIdAndUpdate(user._id, {
        name: nameFromEmail
      });

      console.log(`✅ Updated ${user.email} with name: "${nameFromEmail}"`);
    }

    console.log('🎉 All admin users now have names!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing admin names:', error);
    process.exit(1);
  }
}

// Run the migration
fixAdminNames();