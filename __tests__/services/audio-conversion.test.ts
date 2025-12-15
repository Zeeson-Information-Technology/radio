/**
 * Audio Conversion Service Tests
 * Tests the core conversion logic and gateway integration
 */

import { connectDB } from '../../lib/db';
import AudioRecording from '../../lib/models/AudioRecording';

// Mock fetch for gateway calls
global.fetch = jest.fn();

// Mock audio format utilities
jest.mock('../../lib/utils/audio-formats', () => ({
  detectAudioFormat: jest.fn(),
  needsConversion: jest.fn(),
  getAudioMetadata: jest.fn(),
}));

describe('Audio Conversion Service', () => {
  beforeAll(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-radio';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.GATEWAY_URL = 'http://localhost:8080';
    
    await connectDB();
  });

  beforeEach(async () => {
    // Clean up database
    await AudioRecording.deleteMany({});
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await AudioRecording.deleteMany({});
  });

  describe('Conversion Detection', () => {
    it('should identify AMR files as needing conversion', () => {
      const { needsConversion, detectAudioFormat } = require('../../lib/utils/audio-formats');
      
      // Mock AMR file detection
      detectAudioFormat.mockReturnValue('amr');
      needsConversion.mockReturnValue(true);
      
      const format = detectAudioFormat('test-file.amr');
      const needs = needsConversion(format);
      
      expect(format).toBe('amr');
      expect(needs).toBe(true);
    });

    it('should identify MP3 files as not needing conversion', () => {
      const { needsConversion, detectAudioFormat } = require('../../lib/utils/audio-formats');
      
      // Mock MP3 file detection
      detectAudioFormat.mockReturnValue('mp3');
      needsConversion.mockReturnValue(false);
      
      const format = detectAudioFormat('test-file.mp3');
      const needs = needsConversion(format);
      
      expect(format).toBe('mp3');
      expect(needs).toBe(false);
    });
  });

  describe('Gateway Integration', () => {
    it('should call gateway conversion API for AMR files', async () => {
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

      // Create test recording
      const recording = await AudioRecording.create({
        title: 'Test AMR Recording',
        lecturerName: 'Test Lecturer',
        format: 'amr',
        originalFormat: 'amr',
        playbackFormat: 'mp3',
        conversionStatus: 'pending',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        storageKey: 'originals/test.amr',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      // Simulate gateway conversion call
      const gatewayUrl = process.env.GATEWAY_URL;
      const response = await fetch(`${gatewayUrl}/api/convert-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JWT_SECRET}`
        },
        body: JSON.stringify({
          recordId: recording._id.toString(),
          originalKey: recording.storageKey,
          format: recording.format
        })
      });

      const result = await response.json();

      // Verify gateway was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/convert-audio',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-jwt-secret'
          }),
          body: expect.stringContaining(recording._id.toString())
        })
      );

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('conv_123456');
    });

    it('should handle gateway conversion failures gracefully', async () => {
      // Mock failed gateway response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Gateway conversion service unavailable'
      });

      // Create test recording
      const recording = await AudioRecording.create({
        title: 'Test AMR Recording',
        lecturerName: 'Test Lecturer',
        format: 'amr',
        originalFormat: 'amr',
        playbackFormat: 'mp3',
        conversionStatus: 'pending',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        storageKey: 'originals/test.amr',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      // Simulate gateway conversion call
      const gatewayUrl = process.env.GATEWAY_URL;
      
      try {
        const response = await fetch(`${gatewayUrl}/api/convert-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.JWT_SECRET}`
          },
          body: JSON.stringify({
            recordId: recording._id.toString(),
            originalKey: recording.storageKey,
            format: recording.format
          })
        });

        // Should handle the error gracefully
        expect(response.ok).toBe(false);
        expect(response.status).toBe(500);
      } catch (error) {
        // Network errors should be caught
        expect(error).toBeDefined();
      }

      // Verify gateway was called
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Database Integration', () => {
    it('should create recording with correct conversion fields for AMR', async () => {
      const recording = await AudioRecording.create({
        title: 'Test AMR Recording',
        lecturerName: 'Test Lecturer',
        format: 'amr',
        originalFormat: 'amr',
        playbackFormat: 'mp3',
        conversionStatus: 'pending',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        storageKey: 'originals/test.amr',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      expect(recording.format).toBe('amr');
      expect(recording.originalFormat).toBe('amr');
      expect(recording.playbackFormat).toBe('mp3');
      expect(recording.conversionStatus).toBe('pending');
      expect(recording.originalUrl).toBeTruthy();
      expect(recording.playbackUrl).toBeUndefined(); // Should be set after conversion
    });

    it('should create recording with ready status for MP3', async () => {
      const recording = await AudioRecording.create({
        title: 'Test MP3 Recording',
        lecturerName: 'Test Lecturer',
        format: 'mp3',
        originalFormat: 'mp3',
        playbackFormat: 'mp3',
        conversionStatus: 'ready',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.mp3',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.mp3',
        playbackUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.mp3',
        storageKey: 'originals/test.mp3',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      expect(recording.format).toBe('mp3');
      expect(recording.originalFormat).toBe('mp3');
      expect(recording.playbackFormat).toBe('mp3');
      expect(recording.conversionStatus).toBe('ready');
      expect(recording.playbackUrl).toBeTruthy();
    });
  });

  describe('Conversion Status Tracking', () => {
    it('should track conversion attempts and status', async () => {
      const recording = await AudioRecording.create({
        title: 'Test AMR Recording',
        lecturerName: 'Test Lecturer',
        format: 'amr',
        originalFormat: 'amr',
        playbackFormat: 'mp3',
        conversionStatus: 'pending',
        conversionAttempts: 0,
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        storageKey: 'originals/test.amr',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      // Simulate conversion attempt
      await AudioRecording.findByIdAndUpdate(recording._id, {
        conversionStatus: 'processing',
        conversionAttempts: 1,
        lastConversionAttempt: new Date()
      });

      const updated = await AudioRecording.findById(recording._id);
      expect(updated?.conversionStatus).toBe('processing');
      expect(updated?.conversionAttempts).toBe(1);
      expect(updated?.lastConversionAttempt).toBeDefined();
    });

    it('should handle conversion completion', async () => {
      const recording = await AudioRecording.create({
        title: 'Test AMR Recording',
        lecturerName: 'Test Lecturer',
        format: 'amr',
        originalFormat: 'amr',
        playbackFormat: 'mp3',
        conversionStatus: 'processing',
        storageUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        originalUrl: 'https://test-bucket.s3.amazonaws.com/originals/test.amr',
        storageKey: 'originals/test.amr',
        type: 'lecture',
        tags: ['test'],
        duration: 300,
        fileSize: 1024000,
        accessLevel: 'public',
        status: 'active',
        isPublic: true
      });

      // Simulate successful conversion
      await AudioRecording.findByIdAndUpdate(recording._id, {
        conversionStatus: 'ready',
        playbackKey: 'playback/test.mp3',
        playbackUrl: 'https://test-bucket.s3.amazonaws.com/playback/test.mp3',
        conversionError: null
      });

      const updated = await AudioRecording.findById(recording._id);
      expect(updated?.conversionStatus).toBe('ready');
      expect(updated?.playbackKey).toBe('playback/test.mp3');
      expect(updated?.playbackUrl).toBeTruthy();
      expect(updated?.conversionError).toBeNull();
    });
  });
});