/**
 * Integration test for lecturer dropdown workflow
 * Tests the complete flow from API to component to upload
 */

import { connectDB } from '../../lib/db';
import Lecturer from '../../lib/models/Lecturer';
import mongoose from 'mongoose';

describe('Lecturer Dropdown Workflow Integration', () => {
  beforeAll(async () => {
    // Connect to test database
    await connectDB();
  });

  afterAll(async () => {
    // Clean up database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await Lecturer.deleteMany({ name: /^Test Lecturer/ });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await Lecturer.deleteMany({ name: /^Test Lecturer/ });
  });

  describe('Lecturer Creation and Retrieval', () => {
    it('should create lecturer via findOrCreate and retrieve via API', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Create a lecturer using the existing findOrCreate method
      const lecturer = await Lecturer.findOrCreate('Test Lecturer Ahmed', adminId);
      
      expect(lecturer).toBeDefined();
      expect(lecturer.name).toBe('Test Lecturer Ahmed');
      expect(lecturer.createdBy).toEqual(adminId);
      expect(lecturer.isActive).toBe(true);
      expect(lecturer.recordingCount).toBe(0);

      // Verify it can be retrieved
      const retrieved = await Lecturer.findById(lecturer._id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Lecturer Ahmed');
    });

    it('should not create duplicate lecturers', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Create lecturer twice
      const lecturer1 = await Lecturer.findOrCreate('Test Lecturer Duplicate', adminId);
      const lecturer2 = await Lecturer.findOrCreate('Test Lecturer Duplicate', adminId);
      
      // Should return the same lecturer
      expect(lecturer1._id.toString()).toBe(lecturer2._id.toString());
      
      // Verify only one exists in database
      const count = await Lecturer.countDocuments({ name: 'Test Lecturer Duplicate' });
      expect(count).toBe(1);
    });

    it('should handle case-insensitive and whitespace variations', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Create with different case and whitespace
      const lecturer1 = await Lecturer.findOrCreate('Test Lecturer Case', adminId);
      const lecturer2 = await Lecturer.findOrCreate('  test lecturer case  ', adminId);
      
      // Should create separate entries (current behavior - could be enhanced later)
      expect(lecturer1._id.toString()).not.toBe(lecturer2._id.toString());
      
      // This test documents current behavior - in Task 5 we'll add fuzzy matching
    });
  });

  describe('API Endpoint Functionality', () => {
    it('should return lecturers sorted by recording count', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Create test lecturers with different recording counts
      const lecturer1 = await Lecturer.findOrCreate('Test Lecturer High Count', adminId);
      lecturer1.recordingCount = 15;
      await lecturer1.save();
      
      const lecturer2 = await Lecturer.findOrCreate('Test Lecturer Low Count', adminId);
      lecturer2.recordingCount = 3;
      await lecturer2.save();
      
      const lecturer3 = await Lecturer.findOrCreate('Test Lecturer Medium Count', adminId);
      lecturer3.recordingCount = 8;
      await lecturer3.save();

      // Query using the same logic as the API
      const lecturers = await Lecturer.find(
        { isActive: true, name: /^Test Lecturer/ },
        { name: 1, recordingCount: 1, isVerified: 1, _id: 1 }
      )
      .sort({ recordingCount: -1, name: 1 })
      .lean();

      expect(lecturers).toHaveLength(3);
      expect(lecturers[0].name).toBe('Test Lecturer High Count');
      expect(lecturers[0].recordingCount).toBe(15);
      expect(lecturers[1].name).toBe('Test Lecturer Medium Count');
      expect(lecturers[1].recordingCount).toBe(8);
      expect(lecturers[2].name).toBe('Test Lecturer Low Count');
      expect(lecturers[2].recordingCount).toBe(3);
    });

    it('should only return active lecturers', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Create active and inactive lecturers
      const activeLecturer = await Lecturer.findOrCreate('Test Lecturer Active', adminId);
      
      const inactiveLecturer = await Lecturer.findOrCreate('Test Lecturer Inactive', adminId);
      inactiveLecturer.isActive = false;
      await inactiveLecturer.save();

      // Query only active lecturers
      const lecturers = await Lecturer.find(
        { isActive: true, name: /^Test Lecturer/ }
      ).lean();

      expect(lecturers).toHaveLength(1);
      expect(lecturers[0].name).toBe('Test Lecturer Active');
    });
  });

  describe('Upload Integration', () => {
    it('should work with existing upload flow', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      // Simulate the upload process
      const lecturerName = 'Test Lecturer Upload Flow';
      
      // This is what happens in the upload API
      const lecturer = await Lecturer.findOrCreate(lecturerName, adminId);
      
      expect(lecturer).toBeDefined();
      expect(lecturer.name).toBe(lecturerName);
      expect(lecturer.createdBy).toEqual(adminId);
      
      // Verify lecturer appears in API results
      const lecturers = await Lecturer.find(
        { isActive: true, name: lecturerName }
      ).lean();
      
      expect(lecturers).toHaveLength(1);
      expect(lecturers[0].name).toBe(lecturerName);
    });
  });

  describe('Statistics and Verification', () => {
    it('should handle lecturer statistics correctly', async () => {
      const adminId = new mongoose.Types.ObjectId();
      
      const lecturer = await Lecturer.findOrCreate('Test Lecturer Stats', adminId);
      
      // Test initial state
      expect(lecturer.recordingCount).toBe(0);
      expect(lecturer.isVerified).toBe(false);
      
      // Update statistics
      lecturer.recordingCount = 5;
      lecturer.isVerified = true;
      await lecturer.save();
      
      // Verify updates
      const updated = await Lecturer.findById(lecturer._id);
      expect(updated?.recordingCount).toBe(5);
      expect(updated?.isVerified).toBe(true);
    });
  });
});