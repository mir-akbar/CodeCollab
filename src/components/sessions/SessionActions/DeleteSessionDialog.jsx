/**
 * DeleteSessionDialog Component
 * 
 * Modal dialog for confirming session deletion with comprehensive warnings
 * and safety checks. Provides clear feedback about the destructive nature
 * of the action and potential file cleanup.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Shared State Integration
 * @since 4.1.0
 * 
 * @param {Object} props - Component properties
 * @param {boolean} [props.open=false] - Controls dialog visibility state
 * @param {Function} props.onClose - Callback fired when dialog should close
 * @param {Object} props.session - Session object to be deleted
 * @param {string} props.session.sessionId - Unique session identifier
 * @param {string} props.session.name - Human-readable session name
 * @param {string} props.userEmail - Current user's email for authorization
 * 
 * @example
 * ```jsx
 * <DeleteSessionDialog
 *   open={isDeleteDialogOpen}
 *   onClose={() => setIsDeleteDialogOpen(false)}
 *   session={{
 *     sessionId: 'session-123',
 *     name: 'My Coding Session',
 *     participants: [...]
 *   }}
 *   userEmail="user@example.com"
 * />
 * ```
 * 
 * @features
 * - Clear warning about destructive action
 * - Comprehensive session information display
 * - TanStack Query integration for deletion
 * - Accessible design with proper labels and descriptions
 * - Loading states and error handling
 * - Safety confirmation with session name verification
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
  AlertTriangle, 
  Trash2, 
  FileX, 
  Users,
  Calendar,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteSession } from '@/hooks/useSessions';
import { logDebugInfo, formatSessionDate, getParticipantCount } from '../utils/sessionComponentUtils';
import PropTypes from 'prop-types';

export function DeleteSessionDialog({ 
  open = false, 
  onClose, 
  session, 
  userEmail 
}) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteSessionMutation = useDeleteSession();

  /**
   * Validates if user has typed the correct session name for confirmation
   * @function isConfirmationValid
   * @returns {boolean} - True if confirmation text matches session name
   */
  const isConfirmationValid = useCallback(() => {
    return confirmationText.trim().toLowerCase() === (session?.name || '').trim().toLowerCase();
  }, [confirmationText, session?.name]);

  /**
   * Resets form fields to initial state
   * @function resetForm
   */
  const resetForm = useCallback(() => {
    setConfirmationText('');
    setIsDeleting(false);
  }, []);

  /**
   * Handles session deletion with comprehensive validation and error handling
   * @async
   * @function handleDelete
   */
  const handleDelete = useCallback(async () => {
    if (!session?.sessionId && !session?.id) {
      toast.error('Session not found');
      return;
    }

    if (!isConfirmationValid()) {
      toast.error('Please type the session name exactly to confirm deletion');
      return;
    }

    // Log debug info for development
    logDebugInfo('Deleting session', {
      sessionId: session.sessionId || session.id,
      sessionName: session.name,
      userEmail,
      confirmationText
    });

    setIsDeleting(true);
    
    try {
      await deleteSessionMutation.mutateAsync({
        sessionId: session.sessionId || session.id,
        userEmail: userEmail
      });

      toast.success(`Session "${session.name}" has been deleted successfully`);
      
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error(error.message || "Failed to delete session");
    } finally {
      setIsDeleting(false);
    }
  }, [session, userEmail, confirmationText, isConfirmationValid, deleteSessionMutation, onClose, resetForm]);

  /**
   * Handles dialog close with form reset
   * @function handleClose
   * @param {boolean} isOpen - Dialog open state
   */
  const handleClose = useCallback((isOpen) => {
    if (!isOpen && !isDeleting) {
      onClose();
      resetForm();
    }
  }, [onClose, resetForm, isDeleting]);

  // Return early if no session data
  if (!session) {
    return null;
  }

  const participantCount = getParticipantCount(session); // Now uses optimized count from session object
  const formattedDate = formatSessionDate(session.createdAt);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px]"
        aria-describedby="delete-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Session
          </DialogTitle>
          <DialogDescription id="delete-dialog-description">
            This action cannot be undone. This will permanently delete the session and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-destructive">
                  Permanent Deletion Warning
                </h4>
                <p className="text-sm text-muted-foreground">
                  You are about to permanently delete <strong>&ldquo;{session.name}&rdquo;</strong>. 
                  This will remove all session data, chat history, and associated files.
                </p>
              </div>
            </div>
          </div>

          {/* Session Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Session Details</h4>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{session.name}</span>
              </div>
              
              {session.description && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {session.description}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Participants:
                </span>
                <span className="font-medium">{participantCount}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created:
                </span>
                <span className="font-medium">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* File Warning (if applicable) */}
          {participantCount > 1 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileX className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Multiple Participants
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    This session has {participantCount} participants. All users will lose access to this session and its content.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type the session name to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={session.name}
              disabled={isDeleting}
              aria-required="true"
              aria-describedby="confirmation-help"
            />
            <p id="confirmation-help" className="text-xs text-muted-foreground">
              Enter &ldquo;{session.name}&rdquo; exactly to confirm deletion
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid() || isDeleting}
            className="min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Session
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * PropTypes for DeleteSessionDialog component
 * @memberof DeleteSessionDialog
 */
DeleteSessionDialog.propTypes = {
  /** Controls dialog open/closed state */
  open: PropTypes.bool,
  /** Callback function called when dialog should close */
  onClose: PropTypes.func.isRequired,
  /** Session object to be deleted */
  session: PropTypes.shape({
    /** Primary session identifier */
    sessionId: PropTypes.string,
    /** Legacy session identifier */
    id: PropTypes.string,
    /** Human-readable session name */
    name: PropTypes.string.isRequired,
    /** Optional session description */
    description: PropTypes.string,
    /** Array of session participants */
    participants: PropTypes.array,
    /** Session creation timestamp */
    createdAt: PropTypes.string,
    /** Session creator email */
    creator: PropTypes.string
  }),
  /** Current user's email for authorization */
  userEmail: PropTypes.string.isRequired
};
