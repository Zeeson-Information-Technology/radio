/**
 * Audio Upload and Conversion Tests
 * Tests the upload API endpoint and conversion triggering functionality
 */

// Mock Next.js environment
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(public url: string, public init?: RequestInit) {}
  }
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(public body?: any, public init?: ResponseInit) {}
  }
});

// Mock fetch for gateway conversion calls
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
      uploadFile: jest.fn().mockResolvedValue({
        storageKey: 'originals/test-recording.amr',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test-recording.amr',
        cdnUrl: 'https://test-bucket.s3.amazonaws.com/originals/test-recording.amr',
        fileSize: 1024000
      })
    })
  }
}));

// Mock audio format detection
jest.mock('../../lib/utils/audio-formats', () => ({
  detectAudioFormat: jest.fn().mockReturnValue('amr'),
  needsConversion: jest.fn().mockReturnValue(true),
  getAudioMetadata: jest.fn().mockResolvedValue({
    duration: 300,
    bitrate: 12200,
    sampleRate: 8000
  })
}));

describe('Audio Upload and Conversion API', () => {
  let adminUser: any;
  let category: any;
  let lecturer: any;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.GATEWAY_URL = 'http://localhost:8080';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-radio';
    
    await connectDB();
  });

  beforeEach(async () => {
    // Clean up database
    await AudioRecording.deleteMany({});
    await AdminUser.deleteMany({});
    await Category.deleteMany({});
    await Lecturer.deleteMany({});

    // Create test data
    adminUser = await AdminUser.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin'
    });

    category = await Category.create({
      name: 'Test Category',
      description: 'Test category for audio',
      icon: '📚',
      color: '#10B981'
    });

    lecturer = await Lecturer.create({
      name: 'Test Lecturer',
      bio: 'Test lecturer bio',
      category: category._id
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    // Clean up after each test
    await AudioRecording.deleteMany({});
    await AdminUser.deleteMany({});
    await Category.deleteMany({});
    await Lecturer.deleteMany({});
  });

  describe('AMR File Upload and Conversion Triggering', () => {
    it('should upload AMR file and trigger conversion on gateway', async () => {
      // Mock successful gateway response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'conv_123456',
          status: 'queued',
          message: 'Conversion job queued successfully'
        })
      });

      // Create form data with AMR file
      const formData = new FormData();
      const amrFile = new File(['fake amr content'], 'test-audio.amr', {
        type: 'audio/amr'
      });
      
      formData.append('file', amrFile);
      formData.append('title', 'Test AMR Recording');
      formData.append('description', 'Test description');
      formData.append('lecturer', lecturer._id.toString());
      formData.append('category', category._id.toString());
      formData.append('type', 'lecture');
      formData.append('tags', 'test,amr,conversion');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        }
      });

      // Mock JWT verification
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = await POST(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(true);
      expect(result.conversionStatus).toBe('pending');

      // Verify database record
      const recording = await AudioRecording.findById(result.recordingId);
      expect(recording).toBeTruthy();
      expect(recording.title).toBe('Test AMR Recording');
      expect(recording.format).toBe('amr');
      expect(recording.conversionStatus).toBe('pending');
      expect(recording.originalFormat).toBe('amr');
      expect(recording.playbackFormat).toBe('mp3');

      // Verify gateway conversion call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/convert-audio'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          }),
          body: expect.stringContaining(recording._id.toString())
        })
      );
    });

    it('should handle gateway conversion failure gracefully', async () => {
      // Mock failed gateway response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Gateway conversion service unavailable'
      });

      const formData = new FormData();
      const amrFile = new File(['fake amr content'], 'test-audio.amr', {
        type: 'audio/amr'
      });
      
      formData.append('file', amrFile);
      formData.append('title', 'Test AMR Recording');
      formData.append('lecturer', lecturer._id.toString());
      formData.append('category', category._id.toString());
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        }
      });

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = await POST(request);
      const result = await response.json();

      // Upload should still succeed even if conversion fails
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(true);

      // Verify database record was still created
      const recording = await AudioRecording.findById(result.recordingId);
      expect(recording).toBeTruthy();
      expect(recording.conversionStatus).toBe('pending');
    });

    it('should not trigger conversion for MP3 files', async () => {
      // Mock MP3 file detection
      const { needsConversion, detectAudioFormat } = require('../../lib/utils/audio-formats');
      needsConversion.mockReturnValue(false);
      detectAudioFormat.mockReturnValue('mp3');

      const formData = new FormData();
      const mp3File = new File(['fake mp3 content'], 'test-audio.mp3', {
        type: 'audio/mpeg'
      });
      
      formData.append('file', mp3File);
      formData.append('title', 'Test MP3 Recording');
      formData.append('lecturer', lecturer._id.toString());
      formData.append('category', category._id.toString());
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        }
      });

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = await POST(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.needsConversion).toBe(false);
      expect(result.conversionStatus).toBe('ready');

      // Verify database record
      const recording = await AudioRecording.findById(result.recordingId);
      expect(recording).toBeTruthy();
      expect(recording.format).toBe('mp3');
      expect(recording.conversionStatus).toBe('ready');
      expect(recording.playbackFormat).toBe('mp3');
      expect(recording.playbackUrl).toBeTruthy();

      // Verify no gateway call was made
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Conversion Status Tracking', () => {
    it('should set correct conversion fields for AMR files', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobId: 'conv_123' })
      });

      const formData = new FormData();
      const amrFile = new File(['fake amr content'], 'voice-memo.amr', {
        type: 'audio/amr'
      });
      
      formData.append('file', amrFile);
      formData.append('title', 'Voice Memo');
      formData.append('lecturer', lecturer._id.toString());
      formData.append('category', category._id.toString());
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        }
      });

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = await POST(request);
      const result = await response.json();

      const recording = await AudioRecording.findById(result.recordingId);
      
      // Verify conversion-specific fields
      expect(recording.originalUrl).toBeTruthy();
      expect(recording.originalFormat).toBe('amr');
      expect(recording.playbackFormat).toBe('mp3');
      expect(recording.conversionStatus).toBe('pending');
      expect(recording.conversionAttempts).toBe(0);
      expect(recording.playbackUrl).toBeUndefined(); // Should be set after conversion
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors when calling gateway', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const formData = new FormData();
      const amrFile = new File(['fake amr content'], 'test-audio.amr', {
        type: 'audio/amr'
      });
      
      formData.append('file', amrFile);
      formData.append('title', 'Test AMR Recording');
      formData.append('lecturer', lecturer._id.toString());
      formData.append('category', category._id.toString());
      formData.append('type', 'lecture');

      const request = new NextRequest('http://localhost:3000/api/audio/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        }
      });

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const response = await POST(request);
      const result = await response.json();

      // Upload should still succeed
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Recording should be created with pending status
      const recording = await AudioRecording.findById(result.recordingId);
      expect(recording).toBeTruthy();
      expect(recording.conversionStatus).toBe('pending');
    });
  });
});