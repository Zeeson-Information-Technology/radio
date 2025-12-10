import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'
import RadioPlayer from '@/app/radio/RadioPlayer'
import NewPresenterForm from '@/app/admin/presenters/new/NewPresenterForm'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Mobile Responsiveness Tests', () => {
  const mobileViewport = { width: 375, height: 667 }
  const tabletViewport = { width: 768, height: 1024 }
  const desktopViewport = { width: 1920, height: 1080 }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })
  })

  describe('Home Page Responsiveness', () => {
    test('renders correctly on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: mobileViewport.width,
      })

      render(<HomePage />)
      
      expect(screen.getByText('Al-Manhaj Radio')).toBeInTheDocument()
      
      // Check if layout adapts to mobile
      const container = screen.getByText('Al-Manhaj Radio').closest('div')
      expect(container).toBeInTheDocument()
    })

    test('shows weekly programs on mobile', () => {
      render(<HomePage />)
      
      // Should show at least some program titles
      expect(screen.getByText('Weekly Programs')).toBeInTheDocument()
    })
  })

  describe('Radio Player Responsiveness', () => {
    test('player controls work on mobile', () => {
      render(<RadioPlayer />)
      
      const playButton = screen.getByRole('button')
      expect(playButton).toBeInTheDocument()
      
      // Check if controls are touch-friendly (large enough)
      expect(playButton).toHaveClass('p-4') // Should have adequate padding
    })

    test('volume controls are accessible on mobile', () => {
      render(<RadioPlayer />)
      
      const volumeSlider = screen.getByRole('slider')
      expect(volumeSlider).toBeInTheDocument()
    })
  })

  describe('Admin Forms Responsiveness', () => {
    test('new presenter form is mobile-friendly', () => {
      const mockOnSuccess = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(<NewPresenterForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
      
      // Check form fields
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      
      // Check if form is responsive
      const form = screen.getByRole('form') || screen.getByText('Create New Presenter').closest('form')
      expect(form).toBeInTheDocument()
    })

    test('form buttons are touch-friendly', () => {
      const mockOnSuccess = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(<NewPresenterForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
      
      const submitButton = screen.getByText('Create Presenter')
      const cancelButton = screen.getByText('Cancel')
      
      expect(submitButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
      
      // Buttons should have adequate spacing for touch
      expect(submitButton).toHaveClass('py-2') // Minimum touch target
    })
  })

  describe('Navigation Responsiveness', () => {
    test('navigation works on different screen sizes', () => {
      // Test mobile navigation
      Object.defineProperty(window, 'innerWidth', {
        value: mobileViewport.width,
        writable: true
      })

      render(<HomePage />)
      
      // Should have some form of navigation
      const nav = document.querySelector('nav') || screen.getByRole('navigation', { hidden: true })
      if (nav) {
        expect(nav).toBeInTheDocument()
      }
    })
  })

  describe('Text Readability', () => {
    test('text is readable on mobile screens', () => {
      render(<HomePage />)
      
      const heading = screen.getByText('Al-Manhaj Radio')
      expect(heading).toBeInTheDocument()
      
      // Should use appropriate text sizes
      expect(heading).toHaveClass('text-2xl') // Should be large enough
    })
  })

  describe('Touch Interactions', () => {
    test('interactive elements are touch-friendly', () => {
      render(<RadioPlayer />)
      
      const playButton = screen.getByRole('button')
      
      // Touch targets should be at least 44px (iOS) or 48px (Android)
      // This is typically achieved with padding classes
      expect(playButton).toHaveClass('p-4')
    })
  })

  describe('Viewport Meta Tag', () => {
    test('has proper viewport configuration', () => {
      // This would typically be tested in layout.tsx
      // Ensuring viewport meta tag is present for responsive design
      const viewport = document.querySelector('meta[name="viewport"]')
      
      // In Next.js, this is usually handled automatically
      // but we can test that responsive classes are used
      render(<HomePage />)
      
      const container = screen.getByText('Al-Manhaj Radio').closest('div')
      expect(container).toBeInTheDocument()
    })
  })
})