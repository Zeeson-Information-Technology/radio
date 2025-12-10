/**
 * Seed initial admin user
 * 
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 * 
 * Make sure SUPER_ADMIN_PASSWORD is set in .env.local
 */

// Load environment variables from .env.local
import dotenv from "dotenv";
import path from "path";

// Load .env.local from parent directory
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Now import other modules
import { connectDB } from "../lib/db.js";
import AdminUser from "../lib/models/AdminUser.js";
import { hashPassword } from "../lib/auth.js";

async function seedAdmin() {
  try {
    console.log("🔌 Connecting to database...");
    console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? "✓ Found" : "✗ Not found"}`);
    console.log(`   Super Admin Password: ${process.env.SUPER_ADMIN_PASSWORD ? "✓ Found" : "✗ Not found"}`);
    
    await connectDB();
    console.log("✅ Connected to database\n");

    // Seed super admin first
    const superAdminEmail = "ibrahim.saliman.zainab@gmail.com";
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminPassword) {
      console.error("❌ Error: SUPER_ADMIN_PASSWORD not set in .env.local");
      console.log("\nPlease add to .env.local:");
      console.log("  SUPER_ADMIN_PASSWORD=YourSecurePasswordHere");
      process.exit(1);
    }

    const existingSuperAdmin = await AdminUser.findOne({ 
      email: superAdminEmail.toLowerCase() 
    });

    if (!existingSuperAdmin) {
      console.log("👑 Creating super admin...");
      const superAdminHash = await hashPassword(superAdminPassword);
      
      const superAdmin = await AdminUser.create({
        name: "Ibrahim Saliman Zainab",
        email: superAdminEmail.toLowerCase(),
        passwordHash: superAdminHash,
        role: "super_admin",
        mustChangePassword: false,
        createdBy: null,
      });

      console.log("✅ Super admin created successfully!");
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   ID: ${superAdmin._id}`);
    } else {
      console.log(`✅ Super admin already exists`);
      console.log(`   Email: ${superAdminEmail}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
      console.log(`   ID: ${existingSuperAdmin._id}`);
    }

    // Seed additional admin if specified
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (email && password) {
      console.log("\n👤 Checking for additional admin...");
      const existingAdmin = await AdminUser.findOne({ email: email.toLowerCase() });

      if (existingAdmin) {
        console.log(`⚠️  Admin user with email "${email}" already exists`);
      } else {
        console.log(`   Creating admin: ${email}`);
        const passwordHash = await hashPassword(password);

        const admin = await AdminUser.create({
          name: process.env.ADMIN_NAME || "Admin User",
          email: email.toLowerCase(),
          passwordHash,
          role: "admin",
          mustChangePassword: false,
          createdBy: null,
        });

        console.log("✅ Additional admin created successfully!");
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   ID: ${admin._id}`);
      }
    }

    console.log("\n🎉 Seeding complete!");
    console.log("\nYou can now log in at: http://localhost:3000/admin/login");
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: [Your SUPER_ADMIN_PASSWORD]`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error seeding admin:", error);
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();
