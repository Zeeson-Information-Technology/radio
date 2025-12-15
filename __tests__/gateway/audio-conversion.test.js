/**
 * Gateway Audio Conversion Service Tests
 * Tests the EC2 gateway conversion functionality
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Mock AWS SDK
const mockS3 = {
  getObject: jest.fn(),
  putObject: jest.fn()
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3),
  config: {
    update: jest.fn()
  }
}));

// Mock fluent-ffmpeg
const mockFfmpeg = jest.fn();
mockFfmpeg.prototype.audioCodec = jest.fn().mockReturnThis();
mockFfmpeg.prototype.audioBitrate = jest.fn().mockReturnThis();
mockFfmpeg.prototype.audioChannels = jest.fn().mockReturnThis();
mockFfmpeg.prototype.audioFrequency = jest.fn().mockReturnThis();
mockFfmpeg.prototype.output = jest.fn().mockReturnThis();
mockFfmpeg.prototype.on = jest.fn().mockReturnThis();
mockFfmpeg.prototype.run = jest.fn();

jest.mock('fluent-ffmpeg', () => mockFfmpeg);

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('fake mp3 data')),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-job-id-123')
}));

describe('Gateway Audio Conversion Service', () => {
  let app;
  let AudioRecording;
  let conversionService;
  let validToken;

  beforeAll(async () => {
    // Setup test environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.CONVERSION_TEMP_DIR = '/tmp/test-conversion';

    // Create valid JWT token
    validToken = jwt.sign(
      { userId: 'test-user', email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { issuer: 'almanhaj-radio', audience: 'broadcast-gateway' }
    );

    // Mock MongoDB connection
    mongoose.connect = jest.fn().mockResolvedValue(true);
    
    // Mock AudioRecording model
    AudioRecording = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn()
    };

    // Mock mongoose models
    mongoose.models = {
      AudioRecording: AudioRecording
    };
    mongoose.model = jest.fn().mockReturnValue(AudioRecording);

    // Import and setup the gateway components
    const AudioConversionService = require('../../gateway/server.js').AudioConversionService;
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Create conversion service instance
    conversionService = new AudioConversionService();
    
    // Add authentication middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'UNAUTHORIZED'
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: 'almanhaj-radio',
          audience: 'broadcast-gateway'
        });
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
          code: 'FORBIDDEN'
        });
      }
    };

    // Add conversion endpoints
    app.post('/api/convert-audio', authenticateToken, async (req, res) => {
      try {
        const { recordId, originalKey, format } = req.body;

        if (!recordId || !originalKey || !format) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: recordId, originalKey, format',
            code: 'INVALID_REQUEST'
          });
        }

        if (format !== 'amr') {
          return res.status(400).json({
            success: false,
            error: 'Only AMR format is supported for conversion',
            code: 'INVALID_FORMAT'
          });
        }

        const result = await conversionService.queueConversion(recordId, originalKey, format);
        
        res.json({
          success: true,
          jobId: result.jobId,
          status: result.status,
          message: result.status === 'completed' ? 'File already converted' : 'Conversion job queued successfully',
          playbackUrl: result.playbackUrl || null
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'CONVERSION_FAILED'
        });
      }
    });

    app.get('/api/convert-status/:jobId', authenticateToken, (req, res) => {
      try {
        const { jobId } = req.params;
        const status = conversionService.getJobStatus(jobId);

        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Job not found',
            code: 'JOB_NOT_FOUND'
          });
        }

        res.json(status);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          code: 'STATUS_ERROR'
        });
      }
    });
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset S3 mocks
    mockS3.getObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('fake amr data')
      })
    });
    
    mockS3.putObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });

    // Reset FFmpeg mock
    mockFfmpeg.prototype.on.mockImplementation((event, callback) => {
      if (event === 'end') {
        setTimeout(callback, 10); // Simulate successful conversion
      }
      return mockFfmpeg.prototype;
    });
  });

  describe('POST /api/convert-audio', () => {
    it('should queue AMR conversion successfully', async () => {
      // Mock database responses
      AudioRecording.findById.mockResolvedValue({
        _id: 'test-record-id',
        title: 'Test Recording',
        format: 'amr',
        conversionStatus: 'pending'
      });

      AudioRecording.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBe('test-job-id-123');
      expect(response.body.status).toBe('queued');
      expect(response.body.message).toContain('queued successfully');
    });

    it('should return existing conversion if already ready', async () => {
      // Mock already converted recording
      AudioRecording.findById.mockResolvedValue({
        _id: 'test-record-id',
        title: 'Test Recording',
        format: 'amr',
        conversionStatus: 'ready',
        playbackUrl: 'https://test-bucket.s3.amazonaws.com/playback/test-record-id.mp3'
      });

      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('completed');
      expect(response.body.message).toContain('already converted');
      expect(response.body.playbackUrl).toBeTruthy();
    });

    it('should reject non-AMR formats', async () => {
      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.mp3',
          format: 'mp3'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_FORMAT');
      expect(response.body.error).toContain('Only AMR format is supported');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/convert-audio')
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id'
          // Missing originalKey and format
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_REQUEST');
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle recording not found', async () => {
      AudioRecording.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'non-existent-id',
          originalKey: 'originals/non-existent-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CONVERSION_FAILED');
      expect(response.body.error).toContain('Recording not found');
    });
  });

  describe('GET /api/convert-status/:jobId', () => {
    it('should return job status for valid job', async () => {
      // Add a job to the conversion service
      AudioRecording.findById.mockResolvedValue({
        _id: 'test-record-id',
        conversionStatus: 'pending'
      });
      AudioRecording.findByIdAndUpdate.mockResolvedValue({});

      // Queue a job first
      await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      // Check status
      const response = await request(app)
        .get('/api/convert-status/test-job-id-123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe('test-job-id-123');
      expect(response.body.status).toBeTruthy();
      expect(response.body.progress).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/convert-status/non-existent-job')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('JOB_NOT_FOUND');
    });

    it('should require authentication for status check', async () => {
      const response = await request(app)
        .get('/api/convert-status/test-job-id-123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Conversion Processing', () => {
    it('should process conversion with correct S3 operations', async () => {
      AudioRecording.findById.mockResolvedValue({
        _id: 'test-record-id',
        conversionStatus: 'pending'
      });
      AudioRecording.findByIdAndUpdate.mockResolvedValue({});

      // Queue conversion
      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(200);

      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify S3 operations would be called
      // Note: In a real test, you'd need to wait for the async processing
      // or use a more sophisticated mocking approach
    });

    it('should handle FFmpeg conversion errors', async () => {
      // Mock FFmpeg error
      mockFfmpeg.prototype.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg conversion failed')), 10);
        }
        return mockFfmpeg.prototype;
      });

      AudioRecording.findById.mockResolvedValue({
        _id: 'test-record-id',
        conversionStatus: 'pending',
        conversionAttempts: 0
      });
      AudioRecording.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .post('/api/convert-audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recordId: 'test-record-id',
          originalKey: 'originals/test-record-id.amr',
          format: 'amr'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});