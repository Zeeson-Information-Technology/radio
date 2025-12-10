import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

/**
 * GET /api/test-db
 * Simple database connection test
 */
export async function GET() {
  try {
    await connectDB();
    
    return NextResponse.json({
      ok: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: 'Database connection failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}