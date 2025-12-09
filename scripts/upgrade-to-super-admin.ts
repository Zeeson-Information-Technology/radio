/**
 * Upgrade existing admin to super_admin
 * Run with: npx tsx scripts/upgrade-to-super-admin.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { connectDB } from "../lib/db";
import AdminUser from "../lib/models/AdminUser";

async function upgradeToSuperAdmin() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected!\n");

    const email = "ibrahim.saliman.zainab@gmail.com";
    
    console.log(`Looking for user: ${email}`);
    const user = await AdminUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log("\nRun the seed script first:");
      console.log("  npx tsx scripts/seed-admin.ts");
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Current role: ${user.role}`);

    if (user.role === "super_admin") {
      console.log("\n✅ User is already a super_admin!");
      process.exit(0);
    }

    // Upgrade to super_admin
    user.role = "super_admin";
    await user.save();

    console.log(`\n✅ Successfully upgraded to super_admin!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

upgradeToSuperAdmin();
