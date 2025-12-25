import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/server-auth';
import { connectDB } from '@/lib/db';
import AudioRecording from '@/lib/models/AudioRecording';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Stream audio file for broadcast injection
 * Requirements: 3.1, 3.8 - Audio file loading and error handling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Connect to database
    await connectDB();

    // Find audio file
    const audioFile = await AudioRecording.findById(id);
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    try {
      // Get object from S3
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: audioFile.storageKey,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks);

      // Return audio file with appropriate headers
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': `audio/${audioFile.format}` || 'audio/mpeg',
          'Content-Length': buffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Content-Disposition': `inline; filename="${audioFile.title}.mp3"`,
        },
      });

    } catch (s3Error) {
      console.error('S3 error:', s3Error);
      
      // Handle specific S3 errors (Requirements 3.8)
      if (s3Error instanceof Error) {
        if (s3Error.name === 'NoSuchKey') {
          return NextResponse.json(
            { error: 'Audio file not found in storage' },
            { status: 404 }
          );
        } else if (s3Error.name === 'AccessDenied') {
          return NextResponse.json(
            { error: 'Access denied to audio file' },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to retrieve audio file from storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Audio stream error:', error);
    return NextResponse.json(
      { error: 'Failed to stream audio file' },
      { status: 500 }
    );
  }
}