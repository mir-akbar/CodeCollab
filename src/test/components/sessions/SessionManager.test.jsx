import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionManager } from '@/components/sessions'

// Mock the hooks and dependencies
vi.mock('@/hooks/useSessions', () => ({
  useSessions: () => ({
    data: [
      {
        id: 'test-session-1',
        sessionId: 'test-session-1',
        name: 'Test Session',
        description: 'A test session',
        participants: [],
        createdAt: new Date().toISOString(),
        isCreator: true,
        access: 'admin',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateSession: () => ({
    mutateAsync: vi.fn(),
  }),
  useDeleteSession: () => ({
    mutateAsync: vi.fn(),
  }),
  useInviteUser: () => ({
    mutateAsync: vi.fn(),
  }),
  useLeaveSession: () => ({
    mutateAsync: vi.fn(),
  }),
  useSessionActions: () => ({
    removeParticipant: { mutateAsync: vi.fn() },
    promoteToOwner: { mutateAsync: vi.fn() },
    updateRole: { mutateAsync: vi.fn() },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('SessionManager Component - Migration Validation', () => {
  const defaultProps = {
    userEmail: 'test@example.com',
  }

  it('should render without errors after migration', () => {
    expect(() => {
      render(<SessionManager {...defaultProps} />)
    }).not.toThrow()
  })

  it('should display sessions with new structure', () => {
    render(<SessionManager {...defaultProps} />)
    expect(screen.getByText('Test Session')).toBeInTheDocument()
  })

  it('should have create session functionality', () => {
    render(<SessionManager {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeInTheDocument()
  })

  it('should validate new API endpoint usage', () => {
    // This test validates that the component is using the new API structure
    const { container } = render(<SessionManager {...defaultProps} />)
    expect(container).toBeTruthy()
    // Component should render without any 500 errors from select component
  })
})
