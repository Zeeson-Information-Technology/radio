/**
 * Property-based tests for AudioRecording model
 * Feature: recorded-audio-library
 * Property 1: Metadata Consistency - All required metadata fields must be present and valid
 * Property 4: File Upload Integrity - Stored files should maintain integrity and accessibility
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import AudioRecording, { IAudioRecording } from '../../lib/models/AudioRecording';
import Lecturer from '../../lib/models/Lecturer';
import Category from '../../lib/models/Category';
import AdminUser from '../../lib/models/AdminUser';

let mongoServer: MongoMemoryServer;
let testAdmin: any;
let testLecturer: any;
let testCategory: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create test dependencies
  testAdmin = await AdminUser.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    passwordHash: 'hashed',
    role: 'admin'
  });
  
  testLecturer = await Lecturer.create({
    name: 'Test Lecturer',
    createdBy: testAdmin._id,
    isActive: true
  });
  
  testCategory = await Category.create({
    name: 'Test Category',
    displayOrder: 1
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await AudioRecording.deleteMany({});
});

describe('Feature: recorded-audio-library - AudioRecording Model Properties', () => {
  
  describe('Property 1: Metadata Consistency', () => {
    it('should require all mandatory fields for active recordings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            lecturerName: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom('quran', 'hadith', 'tafsir', 'lecture', 'adhkar'),
            fileName: fc.string({ minLength: 1, maxLength: 255 }),
            originalFileName: fc.string({ minLength: 1, maxLength: 255 }),
            fileSize: fc.integer({ min: 1, max: 500 * 1024 * 1024 }), // Up to 500MB
            duration: fc.integer({ min: 1, max: 7200 }), // Up to 2 hours
            format: fc.constantFrom('mp3', 'wav', 'm4a', 'aac'),
            storageKey: fc.string({ minLength: 10, maxLength: 500 }),
            storageUrl: fc.webUrl(),
            status: fc.constant('active')
          }),
          async (recordingData) => {
            const recording = new AudioRecording({
              ...recordingData,
              lecturer: testLecturer._id,
              category: testCategory._id,
              createdBy: testAdmin._id,
              accessLevel: 'public',
              isPublic: true
            });
            
            await recording.save();
            
            // Property: All required fields must be present and valid
            expect(recording.title).toBeTruthy();
            expect(recording.lecturerName).toBeTruthy();
            expect(recording.lecturer).toBeTruthy();
            expect(recording.category).toBeTruthy();
            expect(recording.type).toBeTruthy();
            expect(recording.fileName).toBeTruthy();
            expect(recording.originalFileName).toBeTruthy();
            expect(recording.fileSize).toBeGreaterThan(0);
            expect(recording.duration).toBeGreaterThan(0);
            expect(recording.format).toBeTruthy();
            expect(recording.storageKey).toBeTruthy();
            expect(recording.storageUrl).toBeTruthy();
            expect(recording.createdBy).toBeTruthy();
            expect(recording.status).toBe('active');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate content type constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('quran', 'hadith', 'tafsir', 'lecture', 'adhkar'),
          async (contentType) => {
            const recording = new AudioRecording({
              title: 'Test Recording',
              lecturerName: 'Test Lecturer',
              lecturer: testLecturer._id,
              category: testCategory._id,
              type: contentType,
              fileName: 'test.mp3',
              originalFileName: 'original.mp3',
              fileSize: 1024,
              duration: 60,
              format: 'mp3',
              storageKey: 'test-key',
              storageUrl: 'https://example.com/test.mp3',
              createdBy: testAdmin._id,
              status: 'active'
            });
            
            await recording.save();
            
            // Property: Content type must be one of the valid Islamic content types
            expect(['quran', 'hadith', 'tafsir', 'lecture', 'adhkar']).toContain(recording.type);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: File Upload Integrity', () => {
    it('should maintain file integrity properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileName: fc.string({ minLength: 1, maxLength: 255 }),
            originalFileName: fc.string({ minLength: 1, maxLength: 255 }),
            fileSize: fc.integer({ min: 1, max: 500 * 1024 * 1024 }),
            format: fc.constantFrom('mp3', 'wav', 'm4a', 'aac'),
            storageKey: fc.string({ minLength: 10, maxLength: 500 }),
            storageUrl: fc.webUrl(),
            bitrate: fc.option(fc.integer({ min: 32, max: 320 })),
            sampleRate: fc.option(fc.integer({ min: 8000, max: 192000 }))
          }),
          async (fileData) => {
            const recording = new AudioRecording({
              title: 'Test Recording',
              lecturerName: 'Test Lecturer',
              lecturer: testLecturer._id,
              category: testCategory._id,
              type: 'lecture',
              duration: 60,
              createdBy: testAdmin._id,
              status: 'active',
              ...fileData
            });
            
            await recording.save();
            
            // Property: File integrity must be maintained
            expect(recording.fileName).toBe(fileData.fileName);
            expect(recording.originalFileName).toBe(fileData.originalFileName);
            expect(recording.fileSize).toBe(fileData.fileSize);
            expect(recording.format).toBe(fileData.format);
            expect(recording.storageKey).toBe(fileData.storageKey);
            expect(recording.storageUrl).toBe(fileData.storageUrl);
            
            // File size must be positive
            expect(recording.fileSize).toBeGreaterThan(0);
            
            // Storage key must be unique
            const duplicateRecording = new AudioRecording({
              title: 'Duplicate Test',
              lecturerName: 'Test Lecturer',
              lecturer: testLecturer._id,
              category: testCategory._id,
              type: 'lecture',
              fileName: 'duplicate.mp3',
              originalFileName: 'duplicate.mp3',
              fileSize: 1024,
              duration: 60,
              format: 'mp3',
              storageKey: fileData.storageKey, // Same storage key
              storageUrl: 'https://example.com/duplicate.mp3',
              createdBy: testAdmin._id,
              status: 'active'
            });
            
            // Should throw error due to unique constraint on storageKey
            await expect(duplicateRecording.save()).rejects.toThrow();
          }
        ),
        { numRuns: 50 } // Reduced runs due to uniqueness constraint testing
      );
    });

    it('should validate audio format constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('mp3', 'wav', 'm4a', 'aac', 'ogg'),
          fc.option(fc.integer({ min: 32, max: 320 })),
          fc.option(fc.integer({ min: 8000, max: 192000 })),
          async (format, bitrate, sampleRate) => {
            const recording = new AudioRecording({
              title: 'Audio Format Test',
              lecturerName: 'Test Lecturer',
              lecturer: testLecturer._id,
              category: testCategory._id,
              type: 'lecture',
              fileName: `test.${format}`,
              originalFileName: `original.${format}`,
              fileSize: 1024,
              duration: 60,
              format,
              bitrate,
              sampleRate,
              storageKey: `test-${Date.now()}-${Math.random()}`,
              storageUrl: `https://example.com/test.${format}`,
              createdBy: testAdmin._id,
              status: 'active'
            });
            
            await recording.save();
            
            // Property: Audio format must be supported
            expect(['mp3', 'wav', 'm4a', 'aac', 'ogg']).toContain(recording.format);
            
            // Property: Bitrate and sample rate must be within valid ranges
            if (recording.bitrate) {
              expect(recording.bitrate).toBeGreaterThanOrEqual(32);
              expect(recording.bitrate).toBeLessThanOrEqual(320);
            }
            
            if (recording.sampleRate) {
              expect(recording.sampleRate).toBeGreaterThanOrEqual(8000);
              expect(recording.sampleRate).toBeLessThanOrEqual(192000);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Search Index Integrity', () => {
    it('should maintain searchable text fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ maxLength: 1000 })),
            lecturerName: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })
          }),
          async (searchData) => {
            const recording = new AudioRecording({
              ...searchData,
              lecturer: testLecturer._id,
              category: testCategory._id,
              type: 'lecture',
              fileName: 'test.mp3',
              originalFileName: 'original.mp3',
              fileSize: 1024,
              duration: 60,
              format: 'mp3',
              storageKey: `search-test-${Date.now()}-${Math.random()}`,
              storageUrl: 'https://example.com/test.mp3',
              createdBy: testAdmin._id,
              status: 'active'
            });
            
            await recording.save();
            
            // Property: All searchable fields must be properly indexed and accessible
            const searchResults = await AudioRecording.find({
              $text: { $search: searchData.title }
            });
            
            expect(searchResults.length).toBeGreaterThan(0);
            expect(searchResults[0].title).toBe(searchData.title);
            expect(searchResults[0].lecturerName).toBe(searchData.lecturerName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});