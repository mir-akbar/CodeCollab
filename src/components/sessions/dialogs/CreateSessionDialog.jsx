/**
 * CreateSessionDialog Component
 * 
 * Modal dialog for creating new coding sessions with comprehensive form validation
 * and error handling. Integrates with TanStack Query for optimistic updates and
 * cache management.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Shared State Integration
 * @since 1.0.0
 * 
 * @param {Object} props - Component properties
 * @param {boolean} [props.open=false] - Controls dialog visibility state
 * @param {Function} props.onClose - Callback fired when dialog should close
 * 
 * @example
 * ```jsx
 * <CreateSessionDialog
 *   open={isCreateDialogOpen}
 *   onClose={() => setIsCreateDialogOpen(false)}
 * />
 * ```
 * 
 * @features
 * - Form validation with visual feedback
 * - TanStack Query integration for data mutations
 * - Accessible form design with proper labels
 * - Loading states and error handling
 * - Automatic form reset on close/success
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { useCreateSession } from "@/hooks/useSessions";
import { useUser } from '@/contexts/UserContext';
import { logDebugInfo } from '../utils/sessionComponentUtils';

export const CreateSessionDialog = ({ open = false, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { userEmail } = useUser();
  
  // Use TanStack Query mutation directly
  const createSessionMutation = useCreateSession();

  /**
   * Handles session creation with comprehensive validation and error handling
   * @async
   * @function handleCreate
   */
  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Session name is required');
      return;
    }

    // Validate session name length
    if (name.trim().length < 3) {
      toast.error('Session name must be at least 3 characters');
      return;
    }

    if (name.trim().length > 100) {
      toast.error('Session name must be less than 100 characters');
      return;
    }

    // Log debug info for development
    logDebugInfo('Creating session', {
      name: name.trim(),
      description: description.trim(),
      userEmail
    });

    try {
      await createSessionMutation.mutateAsync({
        sessionData: {
          name: name.trim(),
          description: description.trim()
        },
        userEmail: userEmail
      });

      toast.success("Your new session has been created successfully");
      
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    }
  }, [name, description, userEmail, createSessionMutation, onClose]);

  /**
   * Resets form fields to initial state
   * @function resetForm
   */
  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
  }, []);

  /**
   * Handles dialog close with form reset
   * @function handleClose
   * @param {boolean} isOpen - Dialog open state
   */
  const handleClose = useCallback((isOpen) => {
    if (!isOpen) {
      onClose();
      resetForm();
    }
  }, [onClose, resetForm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription id="dialog-description">
            Create a new coding session to collaborate with others.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Session Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Coding Session"
              maxLength={100}
              aria-required="true"
              aria-describedby="name-help"
            />
            <p id="name-help" className="text-xs text-muted-foreground">
              Enter a descriptive name for your session (3-100 characters)
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this session"
              className="bg-black resize-none"
              maxLength={500}
              aria-describedby="description-help"
            />
            <p id="description-help" className="text-xs text-muted-foreground">
              Optional description of your session goals and content
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={createSessionMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name.trim() || createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * PropTypes for CreateSessionDialog component
 * @memberof CreateSessionDialog
 */
CreateSessionDialog.propTypes = {
  /** Controls dialog open/closed state */
  open: PropTypes.bool,
  /** Callback function called when dialog should close */
  onClose: PropTypes.func.isRequired
};