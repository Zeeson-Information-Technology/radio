/**
 * Upload API Route Unit Tests
 * Comprehensive tests for the audio upload endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/audio/upload/route';
import { getCurrentAdmin } from '../../../lib/server-auth';
import { connectDB } from '../../../lib/db';
import AudioRecording from '../../../lib/models/AudioRecording';
import Lecturer from '../../../lib/models/Lecturer';
import Category from '../../../lib/models/Category';
import Tag from '../../../lib/models/Tag';
import { S3Service, extractAudioMetadata } from '../../../lib/services/s3';
import AudioConversionService from '../../../lib/services/audioConversion';

// Mock all dependencies
jest.mock('../../../lib/server-auth');
jest.mock('../../../lib/db');
jest.mock('../../../lib/models/AudioRecording');
jest.mock('../../../lib/models/Lecturer');
jest.mock('../../../lib/models/Category');
jest.mock('../../../lib/models/Tag');
jest.mock('../../../lib/services/s3');
jest.mock('../../../lib/services/audioConversion');
jest.mock('jsonwebtoken');

const mockGetCurrentAdmin = getCurrentAdmin as jest.MockedFunction<typeof getCurrentAdmin>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
const mockExtractAudioMetadata = extractAudioMetadata as jest.MockedFunction<typeof extractAudioMetadata>;
const mockAudioConversionService = AudioConversionService as jest.MockedClass<typeof AudioConversionService>;

describe('Upload API Route', () => {
  let mockAdmin: any;
  let mockS3Instance: any;
  let mockConversionInstance: any;
  let mockRequest: NextRequest;
  let mockFormData: FormData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock admin user
    mockAdmin = {
      _id: 'admin123',
      email: 'admin@test.com',
      role: 'admin',
    };

    // Mock S3 service instance
    mockS3Instance = {
      generateOriginalKey: jest.fn().mockReturnValue('uploads/2024/01/test-file.mp3'),
      uploadFromFile: jest.fn().mockResolvedValue({
        storageKey: 'uploads/2024/01/test-file.mp3',
        storageUrl: 'https://s3.amazonaws.com/bucket/uploads/2024/01/test-file.mp3',
        cdnUrl: 'https://cdn.example.com/uploads/2024/01/test-file.mp3',
        fileSize: 5242880, // 5MB
      }),
    };

    // Mock conversion service instance
    mockConversionInstance = {
      // No methods needed for basic tests
    };

    // Setup mocks
    mockGetCurrentAdmin.mockResolvedValue(mockAdmin);
    mockConnectDB.mockResolvedValue(undefined);
    mockS3Service.getInstance.mockReturnValue(mockS3Instance);
    mockAudioConversionService.getInstance.mockReturnValue(mockConversionInstance);
    mockAudioConversionService.needsConversion.mockReturnValue(false);

    // Mock audio metadata extraction
    mockExtractAudioMetadata.mockResolvedValue({
      duration: 300, // 5 minutes
      bitrate: 128,
      sampleRate: 44100,
    });

    // Mock database models
    const mockLecturer = { _id: 'lecturer123', name: 'Test Lecturer' };
    const mockCategory = { _id: 'category123', name: 'Islamic Lectures' };
    const mockAudioRecording = { 
      _id: 'recording123',
      save: jest.fn().mockResolvedValue(true),
      conversionStatus: 'ready',
      visibility: 'public',
      sharedWith: [],
      broadcastReady: true,
    };

    (Lecturer.findOrCreate as jest.Mock).mockResolvedValue(mockLecturer);
    (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (Category.createDefaults as jest.Mock).mockResolvedValue(undefined);
    (Tag.processTags as jest.Mock).mockResolvedValue(['tag1', 'tag2']);
    (AudioRecording as any).mockImplementation(() => mockAudioRecording);

    // Mock lecturer and category methods
    (mockLecturer as any).updateStatistics = jest.fn().mockResolvedValue(undefined);
    (mockCategory as any).updateRecordingCount = jest.fn().mockResolvedValue(undefined);

    // Create mock FormData
    mockFormData = new FormData();
    const mockFile = new File(['test content'], 'test-audio.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(mockFile, 'size', { value: 5242880 }); // 5MB

    mockFormData.append('file', mockFile);
    mockFormData.append('title', 'Test Audio');
    mockFormData.append('lecturerName', 'Test Lecturer');
    mockFormData.append('type', 'lecture');

    // Mock request
    mockRequest = {
      formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetCurrentAdmin.mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should reject users without proper permissions', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'viewer' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Insufficient permissions');
    });

    it('should allow super_admin to upload', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'super_admin' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow admin to upload', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'admin' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow presenter to upload broadcast-ready audio', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'presenter' });
      mockFormData.append('broadcastReady', 'true');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject presenter uploading non-broadcast audio', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'presenter' });
      // Don't set broadcastReady to true

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Presenters can only upload audio marked as broadcast-ready');
    });
  });

  describe('Input Validation', () => {
    it('should reject requests missing required fields', async () => {
      // Remove required field
      mockFormData.delete('title');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Missing required fields');
    });

    it('should reject unsupported file extensions', async () => {
      const mockFile = new File(['test content'], 'test-audio.txt', { type: 'text/plain' });
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Unsupported file extension');
    });

    it('should reject files exceeding 30MB limit', async () => {
      const mockFile = new File(['test content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 35 * 1024 * 1024 }); // 35MB
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('File too large');
      expect(data.message).toContain('35.0MB');
      expect(data.message).toContain('Maximum size is 30MB');
    });

    it('should accept files at exactly 30MB limit', async () => {
      const mockFile = new File(['test content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 30 * 1024 * 1024 }); // Exactly 30MB
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('File Format Support', () => {
    const supportedFormats = [
      { ext: 'mp3', mime: 'audio/mpeg', needsConversion: false },
      { ext: 'mpeg', mime: 'audio/mpeg', needsConversion: true },
      { ext: 'wav', mime: 'audio/wav', needsConversion: false },
      { ext: 'm4a', mime: 'audio/mp4', needsConversion: false },
      { ext: 'amr', mime: 'audio/amr', needsConversion: true },
      { ext: '3gp', mime: 'audio/3gpp', needsConversion: true },
    ];

    supportedFormats.forEach(({ ext, mime, needsConversion }) => {
      it(`should accept ${ext.toUpperCase()} files`, async () => {
        mockAudioConversionService.needsConversion.mockReturnValue(needsConversion);
        
        const mockFile = new File(['test content'], `test-audio.${ext}`, { type: mime });
        Object.defineProperty(mockFile, 'size', { value: 5242880 });
        mockFormData.set('file', mockFile);

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.needsConversion).toBe(needsConversion);
        
        if (needsConversion) {
          expect(data.message).toContain('Conversion to MP3 in progress');
        } else {
          expect(data.message).toBe('Audio uploaded successfully');
        }
      });
    });

    it('should handle files with missing MIME type but valid extension', async () => {
      const mockFile = new File(['test content'], 'test-audio.amr', { type: '' });
      Object.defineProperty(mockFile, 'size', { value: 5242880 });
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle case-insensitive file extensions', async () => {
      const mockFile = new File(['test content'], 'test-audio.MP3', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5242880 });
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Conversion Logic', () => {
    it('should trigger conversion for MPEG files', async () => {
      mockAudioConversionService.needsConversion.mockReturnValue(true);
      
      const mockFile = new File(['test content'], 'test-audio.mpeg', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5242880 });
      mockFormData.set('file', mockFile);

      // Mock fetch for gateway conversion
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job123' }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.needsConversion).toBe(true);
      expect(data.conversionStatus).toBe('pending');
      expect(data.message).toContain('Conversion to MP3 in progress');
    });

    it('should not trigger conversion for MP3 files', async () => {
      mockAudioConversionService.needsConversion.mockReturnValue(false);
      
      const mockFile = new File(['test content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5242880 });
      mockFormData.set('file', mockFile);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.needsConversion).toBe(false);
      expect(data.conversionStatus).toBe('ready');
      expect(data.message).toBe('Audio uploaded successfully');
    });

    it('should handle conversion gateway failures gracefully', async () => {
      mockAudioConversionService.needsConversion.mockReturnValue(true);
      
      const mockFile = new File(['test content'], 'test-audio.mpeg', { type: 'audio/mpeg' });
      Object.defineProperty(mockFile, 'size', { value: 5242880 });
      mockFormData.set('file', mockFile);

      // Mock failed gateway request
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Gateway error'),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      // Upload should still succeed even if conversion fails to start
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.needsConversion).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should set default visibility based on user role', async () => {
      // Test admin default (public)
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'admin' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe('public');
    });

    it('should set presenter default visibility for broadcast uploads', async () => {
      mockGetCurrentAdmin.mockResolvedValue({ ...mockAdmin, role: 'presenter' });
      mockFormData.append('broadcastReady', 'true');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe('shared'); // Presenters default to shared for broadcast uploads
    });

    it('should respect explicit visibility setting', async () => {
      mockFormData.append('visibility', 'private');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe('private');
    });

    it('should handle shared visibility with presenter IDs', async () => {
      mockFormData.append('visibility', 'shared');
      mockFormData.append('sharedWith', JSON.stringify(['presenter1', 'presenter2']));

      // Mock AdminUser validation
      const mockValidPresenters = [
        { _id: 'presenter1' },
        { _id: 'presenter2' }
      ];
      const MockAdminUser = require('../../../lib/models/AdminUser');
      MockAdminUser.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockValidPresenters)
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.visibility).toBe('shared');
      expect(data.sharedWith).toEqual(['presenter1', 'presenter2']);
    });
  });

  describe('Database Operations', () => {
    it('should create lecturer if not exists', async () => {
      const mockNewLecturer = { _id: 'newlecturer123', name: 'New Lecturer' };
      (Lecturer.findOrCreate as jest.Mock).mockResolvedValue(mockNewLecturer);

      mockFormData.set('lecturerName', 'New Lecturer');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Lecturer.findOrCreate).toHaveBeenCalledWith('New Lecturer', mockAdmin._id);
    });

    it('should create default category if not exists', async () => {
      (Category.findOne as jest.Mock).mockResolvedValueOnce(null); // First call returns null
      (Category.findOne as jest.Mock).mockResolvedValueOnce({ _id: 'category123', name: 'Islamic Lectures' }); // Second call after createDefaults

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Category.createDefaults).toHaveBeenCalled();
    });

    it('should process tags correctly', async () => {
      mockFormData.append('tags', 'islam, lecture, quran');

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Tag.processTags).toHaveBeenCalledWith('islam, lecture, quran', mockAdmin._id);
    });

    it('should update statistics after successful upload', async () => {
      const mockLecturer = { 
        _id: 'lecturer123', 
        name: 'Test Lecturer',
        updateStatistics: jest.fn().mockResolvedValue(undefined)
      };
      const mockCategory = { 
        _id: 'category123', 
        name: 'Islamic Lectures',
        updateRecordingCount: jest.fn().mockResolvedValue(undefined)
      };

      (Lecturer.findOrCreate as jest.Mock).mockResolvedValue(mockLecturer);
      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLecturer.updateStatistics).toHaveBeenCalled();
      expect(mockCategory.updateRecordingCount).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 upload failures', async () => {
      mockS3Instance.uploadFromFile.mockRejectedValue(new Error('S3 upload failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Internal server error');
    });

    it('should handle database connection failures', async () => {
      mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Internal server error');
    });

    it('should handle metadata extraction failures', async () => {
      mockExtractAudioMetadata.mockRejectedValue(new Error('Metadata extraction failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Internal server error');
    });

    it('should handle invalid JSON in sharedWith field', async () => {
      mockFormData.append('visibility', 'shared');
      mockFormData.append('sharedWith', 'invalid-json');

      const response = await POST(mockRequest);
      const data = await response.json();

      // Should still succeed but ignore invalid sharedWith
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sharedWith).toEqual([]);
    });
  });

  describe('Response Format', () => {
    it('should return correct response format for successful upload', async () => {
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: expect.any(String),
        recordingId: expect.any(String),
        status: 'active',
        conversionStatus: expect.any(String),
        needsConversion: expect.any(Boolean),
        duration: expect.any(Number),
        fileSize: expect.any(Number),
        visibility: expect.any(String),
        sharedWith: expect.any(Array),
        broadcastReady: expect.any(Boolean),
      });
    });

    it('should include conversion status in response', async () => {
      mockAudioConversionService.needsConversion.mockReturnValue(true);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.needsConversion).toBe(true);
      expect(data.conversionStatus).toBe('pending');
      expect(data.message).toContain('Conversion to MP3 in progress');
    });
  });
});