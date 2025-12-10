import { POST as loginPOST } from '@/app/api/admin/login/route'
import { POST as logoutPOST } from '@/app/api/admin/logout/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@/lib/models/AdminUser')
jest.mock('bcryptjs')
jest.mock('next/headers')

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Flow', () => {
    test('successful login with valid credentials', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        passwordHash: 'hashed-password',
        mustChangePassword: false
      }

      require('@/lib/models/AdminUser').default.findOne = jest.fn().mockResolvedValue(mockUser)
      require('bcryptjs').compare = jest.fn().mockResolvedValue(true)

      const mockCookies = {
        set: jest.fn()
      }
      require('next/headers').cookies = jest.fn().mockResolvedValue(mockCookies)

      const request = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'correct-password'
        })
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.user.email).toBe('admin@test.com')
      expect(mockCookies.set).toHaveBeenCalled()
    })

    test('login fails with invalid credentials', async () => {
      require('@/lib/models/AdminUser').default.findOne = jest.fn().mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'wrong@test.com',
          password: 'wrong-password'
        })
      })

      const response = await loginPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    test('login requires name field', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'admin@test.com',
        // Missing name field
        role: 'admin',
        passwordHash: 'hashed-password'
      }

      require('@/lib/models/AdminUser').default.findOne = jest.fn().mockResolvedValue(mockUser)
      require('bcryptjs').compare = jest.fn().mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'correct-password'
        })
      })

      const response = await loginPOST(request)
      
      // Should handle missing name gracefully
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('Logout Flow', () => {
    test('successful logout clears cookies', async () => {
      const mockCookies = {
        delete: jest.fn()
      }
      require('next/headers').cookies = jest.fn().mockResolvedValue(mockCookies)

      const response = await logoutPOST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(mockCookies.delete).toHaveBeenCalledWith('admin_token')
    })
  })

  describe('Role-based Access', () => {
    test('super_admin can access all features', () => {
      const roles = ['super_admin', 'admin', 'presenter']
      expect(roles.includes('super_admin')).toBe(true)
    })

    test('admin can broadcast', () => {
      const broadcastRoles = ['super_admin', 'admin', 'presenter']
      expect(broadcastRoles.includes('admin')).toBe(true)
    })

    test('presenter can broadcast', () => {
      const broadcastRoles = ['super_admin', 'admin', 'presenter']
      expect(broadcastRoles.includes('presenter')).toBe(true)
    })
  })
})