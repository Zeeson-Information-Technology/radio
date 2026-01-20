/**
 * Audio Upload Validation Tests
 * Comprehensive tests for file upload validation including file size limits,
 * format validation, and error handling
 */

// Mock Next.js environment and globals first
const mockFormData = class MockFormData {
  private data = new Map();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key);
  }
};

global.FormData = mockFormData as any;
global.File = class MockFile {
  constructor(public content: any[], public name: string, public options: any = {}) {
    this.size = content.join('').length;
    this.type = options.type || '';
  }
  size: number;
  type: string;
} as any;

// Mock fetch for gateway calls
global.fetch = jest.fn();

import { NextRequest } from 'next/server';
import { POST } from '../../app/api/audio/upload/route';
import { connectDB } from '../../lib/db';
import AudioRecording from '../../lib/models/AudioRecording';
import AdminUser from '../../lib/models/AdminUser';
import Category from '../../lib/models/Category';
import Lecturer from '../../lib/models/Lecturer';

// Mock S3 service
jest.mock('../../lib/services/s3', () => ({
  S3Service: {
    getInstance: () => ({
      uploadFromFile: jest.fn().mockResolvedValue({
        storageKey: 'originals/test-file.mp3',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test-file.mp3',
        cdnUrl: 'https://test-bucket.s3.amazonaws.com/originals/test-file.mp3',
        fileSize: 1024000
      }),
      generateOriginalKey: jest.fn().mockReturnValue('originals/test-file.mp3')
    })
  },
  extractAudioMetadata: jest.fn().mockResolvedValue({
    duration: 300,
    bitrate: 128000,
    sampleRate: 44100
  })
}));

// Mock audio conversion service
jest.mock('../../lib/services/audioConversion', () => ({
  default: {
    getInstance: () => ({}),
    needsConversion: jest.fn().mockReturnValue(false)
  }
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn()
}));

// Mock getCurrentAdmin
jest.mock('../../lib/server-auth', () => ({
  getCurrentAdmin: jest.fn()
}));

describe('Audio Upload Validation Tests', () => {
  let adminUser: any;
  let presenterUser: any;
  let category: any;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.GATEWAY_URL = 'http://localhost:8080';
    await connectDB();
  });

  beforeEach(async () => {
    // Clean up database
    await AudioRecording.deleteMany({});
    await AdminUser.deleteMany({});
    await Category.deleteMany({});
    await Lecturer.deleteMany({});

    // Create test users
    adminUser = await AdminUser.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      status: 'active'
    });

    presenterUser = await AdminUser.create({
      name: 'Test Presenter',
      email: 'presenter@test.com',
      password: 'hashedpassword',
      role: 'presenter',
      status: 'active'
    });

    // Create default category
    await Category.createDefaults();
    category = await Category.findOne({ name: 'Islamic Lectures' });
  });

  afterEach(async () => {
    await AudioRecording.deleteMany({});
    await AdminUser.deleteMany({});
    await Category.deleteMany({});
    await Lecturer.deleteMany({});
  });

  describe('File Size Validation', () => {
    it('should reject files larger than 30MB', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Create a mock file larger than 30MB (31MB)
      const largeFileSize = 31 * 1024 * 1024; // 31MB
      const largeFile = new File(['x'.repeat(largeFileSize)], 'large-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', largeFile);
      formData.append('title', 'Large Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain('File too large');
      expect(result.message).toContain('31.0MB');
      expect(result.message).toContain('Maximum size is 30MB');
    });

    it('should accept files exactly at 30MB limit', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Create a mock file exactly 30MB
      const maxFileSize = 30 * 1024 * 1024; // 30MB
      const maxFile = new File(['x'.repeat(maxFileSize)], 'max-size-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', maxFile);
      formData.append('title', 'Max Size Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded successfully');
    });

    it('should accept small files under 1MB', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Create a small file (500KB)
      const smallFileSize = 500 * 1024; // 500KB
      const smallFile = new File(['x'.repeat(smallFileSize)], 'small-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', smallFile);
      formData.append('title', 'Small Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('File Format Validation', () => {
    it('should accept MPEG files', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const mpegFile = new File(['fake mpeg content'], 'test-audio.mpeg', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', mpegFile);
      formData.append('title', 'MPEG Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded successfully');
    });

    it('should accept all supported audio formats', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const supportedFormats = [
        { ext: 'mp3', mime: 'audio/mpeg' },
        { ext: 'mpeg', mime: 'audio/mpeg' },
        { ext: 'wav', mime: 'audio/wav' },
        { ext: 'm4a', mime: 'audio/mp4' },
        { ext: 'aac', mime: 'audio/aac' },
        { ext: 'ogg', mime: 'audio/ogg' },
        { ext: 'flac', mime: 'audio/flac' },
        { ext: 'amr', mime: 'audio/amr' },
        { ext: 'webm', mime: 'audio/webm' },
        { ext: '3gp', mime: 'audio/3gpp' }
      ];

      for (const format of supportedFormats) {
        const file = new File(['fake content'], `test-audio.${format.ext}`, {
          type: format.mime
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', `${format.ext.toUpperCase()} Audio File`);
        formData.append('lecturerName', 'Test Lecturer');
        formData.append('type', 'lecture');

        const request = new NextRequest('http://localhost:3000/api/audio/upload', {
          method: 'POST',
          body: formData
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        
        // Clean up for next iteration
        await AudioRecording.deleteMany({});
      }
    });

    it('should reject unsupported file formats', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const unsupportedFormats = [
        { ext: 'txt', mime: 'text/plain' },
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'mp4', mime: 'video/mp4' },
        { ext: 'avi', mime: 'video/avi' },
        { ext: 'doc', mime: 'application/msword' }
      ];

      for (const format of unsupportedFormats) {
        const file = new File(['fake content'], `test-file.${format.ext}`, {
          type: format.mime
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', `${format.ext.toUpperCase()} File`);
        formData.append('lecturerName', 'Test Lecturer');
        formData.append('type', 'lecture');

        const request = new NextRequest('http://localhost:3000/api/audio/upload', {
          method: 'POST',
          body: formData
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unsupported file extension');
      }
    });

    it('should handle files with missing MIME types but valid extensions', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // AMR files often have empty or unrecognized MIME types
      const amrFile = new File(['fake amr content'], 'voice-memo.amr', {
        type: '' // Empty MIME type
      });

      const formData = new FormData();
      formData.append('file', amrFile);
      formData.append('title', 'AMR Voice Memo');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('Required Fields Validation', () => {
    it('should reject upload without file', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const formData = new FormData();
      formData.append('title', 'Test Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required fields');
    });

    it('should reject upload without title', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required fields');
    });

    it('should reject upload without lecturer name', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Test Audio');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required fields');
    });
  });

  describe('Permission Validation', () => {
    it('should reject upload from unauthorized user', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(null);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Test Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });

    it('should allow admin to upload any audio', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Admin Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');
      formData.append('broadcastReady', 'false');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should allow presenter to upload broadcast-ready audio', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(presenterUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Presenter Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');
      formData.append('broadcastReady', 'true');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.broadcastReady).toBe(true);
    });

    it('should reject presenter upload of non-broadcast audio', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(presenterUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Presenter Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');
      formData.append('broadcastReady', 'false');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Presenters can only upload audio marked as broadcast-ready');
    });
  });

  describe('Access Control Features', () => {
    it('should set correct default visibility for admin users', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Admin Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.visibility).toBe('public');
    });

    it('should handle shared visibility with presenter selection', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Shared Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');
      formData.append('visibility', 'shared');
      formData.append('sharedWith', JSON.stringify([presenterUser._id.toString()]));

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.visibility).toBe('shared');
      expect(result.sharedWith).toContain(presenterUser._id.toString());
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 upload failures gracefully', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Mock S3 service to throw error
      const { S3Service } = require('../../lib/services/s3');
      S3Service.getInstance().uploadFromFile.mockRejectedValueOnce(new Error('S3 upload failed'));

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Test Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle database errors gracefully', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Mock AudioRecording.save to throw error
      const originalSave = AudioRecording.prototype.save;
      AudioRecording.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

      const file = new File(['fake content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Test Audio');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal server error');

      // Restore original save method
      AudioRecording.prototype.save = originalSave;
    });
  });

  describe('File Size Edge Cases', () => {
    it('should provide helpful error message for oversized files', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      // Create a 50MB file
      const oversizedFile = new File(['x'.repeat(50 * 1024 * 1024)], 'huge-audio.wav', {
        type: 'audio/wav'
      });

      const formData = new FormData();
      formData.append('file', oversizedFile);
      formData.append('title', 'Huge Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain('File too large (50.0MB)');
      expect(result.message).toContain('Maximum size is 30MB');
      expect(result.message).toContain('Please compress your audio file');
    });

    it('should handle zero-byte files', async () => {
      const { getCurrentAdmin } = require('../../lib/server-auth');
      getCurrentAdmin.mockResolvedValue(adminUser);

      const emptyFile = new File([''], 'empty-audio.mp3', {
        type: 'audio/mpeg'
      });

      const formData = new FormData();
      formData.append('file', emptyFile);
      formData.append('title', 'Empty Audio File');
      formData.append('lecturerName', 'Test Lecturer');
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      // Should accept empty files (they might be valid audio files with just headers)
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });
});