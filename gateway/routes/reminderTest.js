/**
 * POST /api/reminder/test
 * Manually trigger the schedule reminder check.
 * Protected by INTERNAL_API_KEY — for testing only.
 */
'use strict';

const express = require('express');

function createReminderTestRoute(scheduleReminderService) {
  const router = express.Router();

  router.post('/api/reminder/test', async (req, res) => {
    // Auth check
    const auth = req.headers['authorization'];
    const expected = `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`;
    if (auth !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await scheduleReminderService.triggerNow();
      res.json({ ok: true, message: 'Reminder tick triggered — check gateway logs' });
    } catch (err) {
      console.error('Reminder test error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createReminderTestRoute;
