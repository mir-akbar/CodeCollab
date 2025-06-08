/**
 * Clean Invitation Dialog - Core Feature for Demo
 * 
 * Simple, focused component for inviting users to sessions.
 * Uses our enhanced backend that handles email-to-cognitoId resolution.
 * 
 * @version 3.0.0 - Fresh start for demo
 */

import { useState } from 'react';
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
import { useInviteUser } from '../../hooks/useSessions';
import PropTypes from 'prop-types';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer', description: 'Can view session content' },
  { value: 'editor', label: 'Editor', description: 'Can edit and collaborate' },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!session?.sessionId && !session?.id) {
      toast.error('Session not found');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await inviteUser.mutateAsync({
        sessionId: session.sessionId || session.id,
        inviteeEmail: email.trim().toLowerCase(),
        role: role
      });
      
      toast.success(`Invitation sent to ${email}`);
      
      // Reset form and close dialog
      setEmail('');
      setRole('editor');
      onClose();
      
    } catch (error) {
      console.error('Invitation error:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing during submission
    
    setEmail('');
    setRole('editor');
    onClose();
  };

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
            <Label htmlFor="email">Email Address</Label>
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
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
              <SelectTrigger>
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

InvitationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  session: PropTypes.shape({
    id: PropTypes.string,
    sessionId: PropTypes.string,
    name: PropTypes.string,
    participants: PropTypes.arrayOf(PropTypes.object)
  })
};
