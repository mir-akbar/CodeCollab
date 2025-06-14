/**
 * InvitationDialog Component
 * 
 * Modal dialog for inviting users to sessions with comprehensive role-based permissions
 * and email validation. Integrates with enhanced backend for email-to-cognitoId resolution.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Shared State Integration
 * @since 3.0.0
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.open - Controls dialog visibility state
 * @param {Function} props.onClose - Callback fired when dialog should close
 * @param {Object} props.session - Session object to invite users to
 * @param {string} props.session.sessionId - Unique session identifier
 * @param {string} props.session.name - Human-readable session name
 * 
 * @example
 * ```jsx
 * <InvitationDialog
 *   open={isInviteDialogOpen}
 *   onClose={() => setIsInviteDialogOpen(false)}
 *   session={{
 *     sessionId: 'session-123',
 *     name: 'My Coding Session'
 *   }}
 * />
 * ```
 * 
 * @features
 * - Email validation with real-time feedback
 * - Role-based permission selection
 * - TanStack Query integration for optimistic updates
 * - Comprehensive error handling and user feedback
 * - Form state management with proper cleanup
 * - Accessibility compliance with ARIA labels
 */

import { useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInviteUser } from '@/hooks/sessions';
import { useUser } from '@/contexts/UserContext';
import { logDebugInfo } from '../utils/sessionComponentUtils';
import PropTypes from 'prop-types';

/**
 * Available role options for session participants
 * @constant {Array<Object>}
 */
const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer', description: 'Can view session content' },
  { value: 'editor', label: 'Editor', description: 'Can edit and collaborate' },
  { value: 'admin', label: 'Admin', description: 'Can manage users and content' },
  { value: 'owner', label: 'Owner', description: 'Full access and management' },
];

export function InvitationDialog({ 
  open, 
  onClose, 
  session 
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inviteUser = useInviteUser();
  const { userEmail } = useUser();

  /**
   * Validates email format using comprehensive regex
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if email is valid
   */
  const validateEmail = useCallback((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  /**
   * Resets form to initial state
   * @function resetForm
   */
  const resetForm = useCallback(() => {
    setEmail('');
    setRole('editor');
  }, []);

  /**
   * Handles form submission with comprehensive validation
   * @async
   * @function handleSubmit
   * @param {Event} e - Form submission event
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!session?.sessionId && !session?.id) {
      toast.error('Session not found');
      return;
    }

    // Log debug info for development
    logDebugInfo('Inviting user to session', {
      email: email.trim(),
      role,
      sessionId: session.sessionId || session.id,
      sessionName: session.name
    });

    setIsSubmitting(true);
    
    try {
      const result = await inviteUser.mutateAsync({
        sessionId: session.sessionId || session.id,
        inviteeEmail: email.trim().toLowerCase(),
        role: role,
        inviterEmail: userEmail
      });
      
      // Show different messages based on response data
      if (result?.alreadyParticipant) {
        toast.success(
          `${email} is already a ${result.currentRole} in this session`,
          { duration: 4000 }
        );
      } else if (result?.userExistedBefore === false) {
        toast.success(
          `Invitation sent to ${email}! They'll be able to join when they create an account.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Invitation sent to ${email}`);
      }
      
      // Reset form and close dialog
      resetForm();
      onClose();
      
    } catch (error) {
      console.error('Invitation error:', error);
      
      // Extract proper error message from axios response or fallback
      let errorMessage = 'Failed to send invitation';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, role, session, validateEmail, inviteUser, userEmail, onClose, resetForm]);

  /**
   * Handles dialog close with form cleanup
   * @function handleClose
   */
  const handleClose = useCallback(() => {
    if (isSubmitting) return; // Prevent closing during submission
    
    resetForm();
    onClose();
  }, [isSubmitting, resetForm, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite to Session
          </DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on &ldquo;{session?.name || 'this session'}&rdquo;
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isSubmitting}
                autoComplete="email"
                aria-required="true"
                aria-describedby="email-help"
              />
            </div>
            <p id="email-help" className="text-xs text-muted-foreground">
              Enter the email address of the person you want to invite
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Permission Level</Label>
            <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
              <SelectTrigger aria-describedby="role-help">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="role-help" className="text-xs text-muted-foreground">
              Choose the permission level for this user
            </p>
          </div>

          {/* Session Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm">Session Details</h4>
            <p className="text-sm text-muted-foreground">
              {session?.name || 'Untitled Session'}
            </p>
            <p className="text-xs text-muted-foreground">
              {session?.participants?.length || 0} current participants
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PropTypes for InvitationDialog component
 * @memberof InvitationDialog
 */
InvitationDialog.propTypes = {
  /** Controls dialog open/closed state */
  open: PropTypes.bool.isRequired,
  /** Callback function called when dialog should close */
  onClose: PropTypes.func.isRequired,
  /** Session object containing invitation details */
  session: PropTypes.shape({
    /** Legacy session identifier */
    id: PropTypes.string,
    /** Primary session identifier */
    sessionId: PropTypes.string,
    /** Human-readable session name */
    name: PropTypes.string,
    /** Array of current session participants */
    participants: PropTypes.arrayOf(PropTypes.object)
  })
};
