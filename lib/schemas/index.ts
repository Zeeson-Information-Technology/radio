/**
 * PRODUCTION-GRADE INPUT VALIDATION SCHEMAS
 * 
 * Uses Zod for runtime type checking and validation
 * Prevents NoSQL injection, XSS, and other input-based attacks
 * 
 * Reference: OWASP Input Validation Cheat Sheet
 */

import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase(),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Password too long'),
  
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and numbers'
    ),
  
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// BROADCAST SCHEMAS
// ============================================================================

export const broadcastStartSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  
  lecturer: z
    .string()
    .min(1, 'Lecturer name is required')
    .max(100, 'Lecturer name too long')
    .trim(),
  
  config: z.object({
    sampleRate: z.enum(['44100', '48000']).optional(),
    channels: z.enum(['1', '2']).optional(),
    bitrate: z.enum(['96', '128', '192']).optional(),
  }).optional(),
});

export type BroadcastStartInput = z.infer<typeof broadcastStartSchema>;

export const broadcastTokenSchema = z.object({
  duration: z
    .number()
    .int()
    .min(60, 'Token duration must be at least 60 seconds')
    .max(86400, 'Token duration cannot exceed 24 hours')
    .optional()
    .default(3600), // Default 1 hour
});

export type BroadcastTokenInput = z.infer<typeof broadcastTokenSchema>;

// ============================================================================
// AUDIO SCHEMAS
// ============================================================================

export const audioUploadSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  
  lecturer: z
    .string()
    .min(1, 'Lecturer name is required')
    .max(100, 'Lecturer name too long')
    .trim(),
  
  category: z
    .string()
    .max(100, 'Category too long')
    .optional(),
  
  tags: z
    .array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

export type AudioUploadInput = z.infer<typeof audioUploadSchema>;

export const audioUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim()
    .optional(),
  
  lecturer: z
    .string()
    .min(1, 'Lecturer name is required')
    .max(100, 'Lecturer name too long')
    .trim()
    .optional(),
  
  category: z
    .string()
    .max(100, 'Category too long')
    .optional(),
  
  tags: z
    .array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

export type AudioUpdateInput = z.infer<typeof audioUpdateSchema>;

// ============================================================================
// SCHEDULE SCHEMAS
// ============================================================================

export const scheduleCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  
  startTime: z
    .string()
    .datetime('Invalid date format')
    .or(z.date()),
  
  endTime: z
    .string()
    .datetime('Invalid date format')
    .or(z.date()),
  
  lecturerId: z
    .string()
    .min(1, 'Lecturer is required')
    .max(255),
  
  description: z
    .string()
    .max(1000, 'Description too long')
    .optional(),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return start < end;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;

export const scheduleUpdateSchema = scheduleCreateSchema.partial();

export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;

// ============================================================================
// PRESENTER SCHEMAS
// ============================================================================

export const presenterCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim(),
  
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase(),
  
  role: z
    .enum(['admin', 'presenter'])
    .default('presenter'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export type PresenterCreateInput = z.infer<typeof presenterCreateSchema>;

export const presenterUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim()
    .optional(),
  
  role: z
    .enum(['admin', 'presenter'])
    .optional(),
});

export type PresenterUpdateInput = z.infer<typeof presenterUpdateSchema>;

// ============================================================================
// SHARED VALIDATION
// ============================================================================

/**
 * Validate pagination parameters
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  
  sort: z
    .string()
    .max(50)
    .optional(),
  
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Validate MongoDB ObjectId
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

/**
 * Parse and validate JSON safely
 */
export function parseAndValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { success: false, error: errors.join(', ') };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Limit length
}

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
  name: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^[\w\-. ]+$/i, 'Invalid filename characters'),
  
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(500 * 1024 * 1024, 'File cannot exceed 500MB'),
  
  type: z
    .string()
    .min(1, 'File type is required')
    .regex(/^[a-z]+\/[a-z0-9+.\-]+$/i, 'Invalid MIME type'),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

/**
 * Allowed audio MIME types
 */
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
  'audio/flac',
];

/**
 * Validate audio file upload
 */
export const audioFileUploadSchema = fileUploadSchema.refine(
  (file) => ALLOWED_AUDIO_TYPES.includes(file.type),
  {
    message: `Invalid audio format. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`,
    path: ['type'],
  }
).refine(
  (file) => file.size <= 100 * 1024 * 1024, // 100MB for audio
  {
    message: 'Audio file cannot exceed 100MB',
    path: ['size'],
  }
);

export type AudioFileUploadInput = z.infer<typeof audioFileUploadSchema>;
