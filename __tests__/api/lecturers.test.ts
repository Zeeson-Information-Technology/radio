/**
 * @jest-environment node
 */

import { GET } from '@/app/api/lecturers/route';
import { NextRequest } from 'next/server';
import { connectDB } from '../../lib/db';
import Lecturer from '@/lib/models/Lecturer';
import mongoose from 'mongoose';

// Mock the database connection
jest.mock('@/lib/db/connection');
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

describe('/api/lecturers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up any database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET', () => {
    it('should return lecturers sorted by recording count', async () => {
      // Mock lecturer data
      const mockLecturers = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Dr. Ahmed Hassan',
          recordingCount: 15,
          isVerified: true,
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Sheikh Omar Ali',
          recordingCount: 8,
          isVerified: false,
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Prof. Fatima Said',
          recordingCount: 22,
          isVerified: true,
          isActive: true
        }
      ];

      // Mock Lecturer.find chain
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockLecturers)
          })
        })
      });

      // Mock the Lecturer model
      jest.spyOn(Lecturer, 'find').mockImplementation(mockFind);

      const request = new NextRequest('http://localhost:3000/api/lecturers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lecturers).toHaveLength(3);
      
      // Verify lecturers are returned with correct fields
      expect(data.lecturers[0]).toEqual({
        _id: mockLecturers[0]._id.toString(),
        name: 'Dr. Ahmed Hassan',
        recordingCount: 15,
        isVerified: true
      });

      // Verify the query was called correctly
      expect(mockFind).toHaveBeenCalledWith(
        { isActive: true },
        {
          name: 1,
          recordingCount: 1,
          isVerified: 1,
          _id: 1
        }
      );
    });

    it('should handle empty lecturer list', async () => {
      // Mock empty result
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      jest.spyOn(Lecturer, 'find').mockImplementation(mockFind);

      const request = new NextRequest('http://localhost:3000/api/lecturers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.lecturers).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      jest.spyOn(Lecturer, 'find').mockImplementation(mockFind);

      const request = new NextRequest('http://localhost:3000/api/lecturers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to fetch lecturers');
      expect(data.lecturers).toEqual([]); // Fallback empty array
    });

    it('should limit results to 100 lecturers', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      jest.spyOn(Lecturer, 'find').mockImplementation(mockFind);

      const request = new NextRequest('http://localhost:3000/api/lecturers');
      await GET(request);

      // Verify limit was called with 100
      const mockChain = mockFind().sort().limit;
      expect(mockChain).toHaveBeenCalledWith(100);
    });

    it('should sort by recording count descending, then name ascending', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
          })
        })
      });

      jest.spyOn(Lecturer, 'find').mockImplementation(mockFind);

      const request = new NextRequest('http://localhost:3000/api/lecturers');
      await GET(request);

      // Verify sort was called with correct parameters
      const mockChain = mockFind().sort;
      expect(mockChain).toHaveBeenCalledWith({ recordingCount: -1, name: 1 });
    });
  });
});