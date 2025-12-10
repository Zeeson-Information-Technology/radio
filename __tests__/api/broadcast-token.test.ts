import { POST } from '@/app/api/admin/live/broadcast-token/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@/lib/models/AdminUser')
jest.mock('@/lib/auth')
jest.mock('next/headers')

describe('/api/admin/live/broadcast-token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('generates broadcast token for authenticated admin', async () => {
    // Mock authenticated request
    const mockCookies = {
      get: jest.fn().mockReturnValue({ value: 'valid-admin-token' })
    }
    
    require('next/headers').cookies = jest.fn().mockResolvedValue(mockCookies)
    require('@/lib/auth').verifyAuthToken = jest.fn().mockReturnValue({
      userId: 'user123'
    })
    
    const mockUser = {
      _id: 'user123',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin'
    }
    
    require('@/lib/models/AdminUser').default.findById = jest.fn().mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost:3000/api/admin/live/broadcast-token', {
      method: 'POST'
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.token).toBeDefined()
    expect(data.user.email).toBe('admin@test.com')
  })

  test('rejects unauthenticated request', async () => {
    const mockCookies = {
      get: jest.fn().mockReturnValue(undefined)
    }
    
    require('next/headers').cookies = jest.fn().mockResolvedValue(mockCookies)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authenticated')
  })

  test('rejects user without broadcast permissions', async () => {
    const mockCookies = {
      get: jest.fn().mockReturnValue({ value: 'valid-token' })
    }
    
    require('next/headers').cookies = jest.fn().mockResolvedValue(mockCookies)
    require('@/lib/auth').verifyAuthToken = jest.fn().mockReturnValue({
      userId: 'user123'
    })
    
    const mockUser = {
      _id: 'user123',
      email: 'user@test.com',
      name: 'Regular User',
      role: 'viewer' // Not allowed to broadcast
    }
    
    require('@/lib/models/AdminUser').default.findById = jest.fn().mockResolvedValue(mockUser)

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions to broadcast')
  })
})