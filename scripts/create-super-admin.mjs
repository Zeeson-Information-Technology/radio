/**
 * Create Super Admin - Standalone Script
 * 
 * Usage: node scripts/create-super-admin.mjs
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, "../.env.local") });

// Define AdminUser schema inline
const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "presenter"], default: "presenter" },
  mustChangePassword: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
  lastLoginAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);

async function createSuperAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const superAdminEmail = "ibrahim.saliman.zainab@gmail.com";

    console.log("🔌 Connecting to MongoDB...");
    
    if (!mongoUri) {
      console.error("❌ MONGODB_URI not found in .env.local");
      process.exit(1);
    }

    if (!superAdminPassword) {
      console.error("❌ SUPER_ADMIN_PASSWORD not found in .env.local");
      console.log("\nPlease add to .env.local:");
      console.log("  SUPER_ADMIN_PASSWORD=YourSecurePasswordHere");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Check if super admin exists
    const existing = await AdminUser.findOne({ email: superAdminEmail });

    if (existing) {
      console.log("✅ Super admin already exists!");
      console.log(`   Email: ${existing.email}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   ID: ${existing._id}`);
      console.log("\nYou can log in with this account.");
    } else {
      console.log("👑 Creating super admin...");
      
      // Hash password
      const passwordHash = await bcrypt.hash(superAdminPassword, 10);
      
      // Create super admin
      const superAdmin = await AdminUser.create({
        email: superAdminEmail,
        passwordHash,
        role: "admin",
        mustChangePassword: false,
        createdBy: null,
      });

      console.log("✅ Super admin created successfully!");
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   ID: ${superAdmin._id}`);
    }

    console.log("\n🎉 Setup complete!");
    console.log("\n📝 Login Details:");
    console.log(`   URL: http://localhost:3000/admin/login`);
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: [Your SUPER_ADMIN_PASSWORD from .env.local]`);
    console.log("\n💡 As super admin, you can:");
    console.log("   • Create other admin accounts");
    console.log("   • Create presenter accounts");
    console.log("   • Manage live streams");
    console.log("   • Access all features");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

createSuperAdmin();
