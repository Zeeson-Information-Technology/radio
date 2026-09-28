/**
 * ScheduleReminderService
 *
 * Runs a cron job every minute on the gateway server (DigitalOcean).
 * Checks whether any scheduled programme starts within REMINDER_MINUTES_BEFORE
 * minutes and, if so, sends a push notification to all subscribers via the
 * Next.js /api/push/send endpoint.
 *
 * Deduplication: a sent-set keyed by "<scheduleId>-<YYYY-MM-DD>" ensures each
 * programme only gets one reminder per day, regardless of how many cron ticks
 * fall inside the window.
 *
 * Configuration (gateway .env):
 *   REMINDER_MINUTES_BEFORE=15   — how many minutes before start to notify (default 15)
 *   NEXTJS_API_URL               — base URL of the Next.js app (already set)
 *   INTERNAL_API_KEY             — shared secret for /api/push/send (already set)
 */

'use strict';

const cron = require('node-cron');
const mongoose = require('mongoose');

// ── Schedule model (mirrors lib/models/Schedule.ts) ──────────────────────────
const ScheduleSchema = new mongoose.Schema({
  dayOfWeek:      { type: Number, required: true },   // 0=Sun … 6=Sat
  startTime:      { type: String, required: true },   // "HH:MM" 24h
  timezone:       { type: String, default: 'Africa/Lagos' },
  durationMinutes:{ type: Number, required: true },
  lecturer:       { type: String, required: true },
  topic:          { type: String, required: true },
  active:         { type: Boolean, default: true },
  recurringType:  { type: String, default: 'weekly' },
});

const Schedule =
  mongoose.models.Schedule ||
  mongoose.model('Schedule', ScheduleSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a schedule entry into the next wall-clock Date it will start,
 * expressed in UTC, relative to `now`.
 * Returns null if the schedule is not recurring weekly or the next occurrence
 * is more than 8 days away (safety guard).
 */
function nextOccurrenceUTC(schedule, now) {
  const { dayOfWeek, startTime, timezone } = schedule;
  const [hh, mm] = startTime.split(':').map(Number);

  // Build a candidate date in the schedule's timezone for the current week
  // by finding how many days until `dayOfWeek` from today (in that timezone).
  const nowInTZ = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  );
  const todayDow = nowInTZ.getDay(); // 0-6

  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil < 0) daysUntil += 7;

  // Candidate: today's date in the target TZ + daysUntil + hh:mm
  const candidate = new Date(now);
  candidate.setDate(candidate.getDate() + daysUntil);

  // Set the time components using the offset trick:
  // format a date string in that timezone, then reconstruct with explicit time
  const dateStr = candidate.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  const localStr = `${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;

  // Parse as local time in the given timezone → UTC
  // We use the Intl offset at that specific moment
  const naive = new Date(localStr);        // treated as LOCAL (server) time — we fix below
  const tzOffset = getTZOffset(timezone, naive); // minutes west
  const utc = new Date(naive.getTime() + tzOffset * 60000);

  // If the candidate is in the past by more than 1 minute, move it 7 days forward
  if (utc.getTime() < now.getTime() - 60000) {
    utc.setDate(utc.getDate() + 7);
  }

  // Safety: ignore anything more than 8 days out
  if (utc.getTime() - now.getTime() > 8 * 24 * 3600 * 1000) return null;

  return utc;
}

/**
 * Return the UTC offset (in minutes, positive = west) for a timezone at a
 * given date, using the Intl API — works without any external library.
 */
function getTZOffset(timezone, date) {
  // Format both UTC and local representations, then diff
  const utcStr  = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr   = date.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate  = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000; // minutes
}

/**
 * Return a dedup key: "<id>-<YYYY-MM-DD in UTC>" so one notification per
 * schedule per calendar day.
 */
function dedupKey(scheduleId, now) {
  const d = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${scheduleId}-${d}`;
}

// ── Service class ─────────────────────────────────────────────────────────────

class ScheduleReminderService {
  constructor() {
    this.reminderMinutes = parseInt(process.env.REMINDER_MINUTES_BEFORE || '15', 10);
    this.nextjsApiUrl    = (process.env.NEXTJS_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.internalKey     = process.env.INTERNAL_API_KEY || 'internal';
    this.sentToday       = new Map(); // dedupKey → true
    this.cronTask        = null;

    console.log(`📅 ScheduleReminderService: will notify ${this.reminderMinutes} min before each programme`);
  }

  start() {
    // Run every minute — lightweight: just a DB read + optional HTTP call
    this.cronTask = cron.schedule('* * * * *', () => this._tick().catch(err => {
      console.error('📅 Reminder cron error:', err.message);
    }));

    // Clear the dedup map at midnight UTC so each day starts fresh
    cron.schedule('0 0 * * *', () => {
      this.sentToday.clear();
      console.log('📅 Reminder dedup map cleared for new day');
    });

    console.log('📅 ScheduleReminderService started — cron running every minute');
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  }

  /**
   * Manually trigger a reminder check — for testing only.
   * Bypasses both the time-window check and the dedup map so it always fires
   * for all active schedules regardless of when they are scheduled.
   */
  async triggerNow() {
    console.log('📅 Manual reminder trigger — bypassing time window + dedup map');
    this.sentToday.clear(); // allow re-send for testing
    await this._tick(true); // testMode = skip time window
  }

  async _tick(testMode = false) {
    const now = new Date();

    // Fetch all active schedules from MongoDB
    const schedules = await Schedule.find({ active: true }).lean();
    if (!schedules.length) return;

    for (const schedule of schedules) {
      const next = nextOccurrenceUTC(schedule, now);
      if (!next) continue;

      const minutesUntil = (next.getTime() - now.getTime()) / 60000;

      // Window: send when between reminderMinutes and (reminderMinutes - 1) minutes away
      // e.g. with reminderMinutes=15: fires when 14 < minutesUntil <= 15
      // In testMode, skip the window check and always fire
      if (!testMode && (minutesUntil > this.reminderMinutes || minutesUntil <= this.reminderMinutes - 1)) continue;

      const key = dedupKey(schedule._id.toString(), now);
      if (this.sentToday.has(key)) continue; // already sent today

      // Mark as sent before the async call to prevent double-send on slow responses
      this.sentToday.set(key, true);

      await this._sendNotification(schedule, Math.round(minutesUntil));
    }
  }

  async _sendNotification(schedule, minutesUntil) {
    const lecturer = schedule.lecturer || 'Sheikh';
    const topic    = schedule.topic    || 'Islamic Lecture';
    const title    = `📻 Coming up in ${minutesUntil} minutes`;
    const body     = `${topic} — ${lecturer}`;

    console.log(`📅 Sending reminder: "${body}" (${minutesUntil} min)`);

    try {
      const res = await fetch(`${this.nextjsApiUrl}/api/push/send`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.internalKey}`,
        },
        body: JSON.stringify({ title, body, url: '/radio' }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        console.log(`📅 Reminder sent: ${data.sent ?? '?'} subscribers notified`);
      } else {
        console.warn(`📅 Reminder push failed (${res.status}):`, data);
        // Remove from sent map so it can retry next tick
        this.sentToday.delete(dedupKey(schedule._id.toString(), new Date()));
      }
    } catch (err) {
      console.error('📅 Reminder HTTP error:', err.message);
      this.sentToday.delete(dedupKey(schedule._id.toString(), new Date()));
    }
  }
}

module.exports = ScheduleReminderService;
