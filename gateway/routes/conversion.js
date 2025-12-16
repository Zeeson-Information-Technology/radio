/**
 * Audio conversion routes
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function createConversionRoutes(conversionService) {
  // Queue audio conversion
  router.post('/api/convert-audio', authenticateToken, async (req, res) => {
    try {
      const { recordId, originalKey, format } = req.body;

      // Validate request
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

      // Queue conversion
      const result = await conversionService.queueConversion(recordId, originalKey, format);
      
      res.json({
        success: true,
        jobId: result.jobId,
        status: result.status,
        message: result.status === 'completed' ? 'File already converted' : 'Conversion job queued successfully',
        playbackUrl: result.playbackUrl || null
      });

    } catch (error) {
      console.error('❌ Conversion API error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CONVERSION_FAILED'
      });
    }
  });

  // Get conversion status
  router.get('/api/convert-status/:jobId', authenticateToken, (req, res) => {
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
      console.error('❌ Status API error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'STATUS_ERROR'
      });
    }
  });

  return router;
}

module.exports = createConversionRoutes;