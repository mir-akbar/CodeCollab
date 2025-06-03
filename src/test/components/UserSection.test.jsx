import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserSection } from '@/components/UserSection'

// Mock the session hooks
vi.mock('@/hooks/useSessions', () => ({
  default: () => ({
    sessions: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSessionManager', () => ({
  default: () => ({
    createSession: vi.fn(),
    inviteUser: vi.fn(),
    deleteSession: vi.fn(),
    leaveSession: vi.fn(),
    refreshSessions: vi.fn(),
  }),
}))

// Mock API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { participants: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}))

describe('UserSection Component', () => {
  const defaultProps = {
    userEmail: 'test@example.com',
    sessionId: 'test-session-123',
  }

  it('should render without the select component error', () => {
    expect(() => {
      render(<UserSection {...defaultProps} />)
    }).not.toThrow()
  })

  it('should display user email', () => {
    render(<UserSection {...defaultProps} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should render collaboration dialog trigger', () => {
    render(<UserSection {...defaultProps} />)
    expect(screen.getByText('Collaborate')).toBeInTheDocument()
  })
})
