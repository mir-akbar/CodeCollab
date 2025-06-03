import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { encryptData } from "@/utils/encryption";
import { ParticipantsList } from "./ParticipantsList";
import PropTypes from "prop-types";
import { getAssignableRoles, canManageParticipants, roleToAccess } from '@/utils/permissions';
import { validateInvite, formatPermissionError } from '@/utils/permissionValidation';
import { toast } from "sonner";
import { useInviteUser, useSessionDetails } from '@/hooks/useSessions';
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const InviteDialog = ({ open = false, session = null, currentUserEmail = "", currentUserRole = "viewer", userEmail, onClose }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [method, setMethod] = useState("email");
  const [link, setLink] = useState("");
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch real-time session data when dialog is open
  const sessionId = session?.sessionId || session?.id;
  const { 
    data: liveSession, 
    isLoading: isLoadingSession,
    error: sessionError 
  } = useSessionDetails(sessionId);

  // Use live session data if available, fallback to prop
  const activeSession = (open && liveSession) ? liveSession : session;

  // TanStack Query mutations
  const inviteUserMutation = useInviteUser();

  // Get loading states
  const isSubmitting = inviteUserMutation.isPending;

  // Get roles that current user can assign
  const assignableRoles = getAssignableRoles(currentUserRole);
  const canInvite = canManageParticipants(currentUserRole);

  // Debug logging
  console.log("InviteDialog Debug:", {
    open,
    currentUserRole,
    canInvite,
    assignableRoles,
    session: activeSession,
    sessionError
  });

  const generateLink = () => {
    const legacyAccess = roleToAccess(role); // Convert role to legacy access for URL compatibility
    const encryptedAccess = encodeURIComponent(encryptData(legacyAccess));
    const sessionIdentifier = encodeURIComponent(activeSession?.sessionId || activeSession?.id);
    const baseUrl = window.location.origin;
    const newLink = `${baseUrl}/workspace?session=${sessionIdentifier}&access=${encryptedAccess}`;
    setLink(newLink);
    navigator.clipboard.writeText(newLink)
      .then(() => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      })
      .catch(err => console.error("Could not copy link: ", err));
  };

  const handleSendInvite = async () => {
    if (method === "email" && (!email || !email.includes('@'))) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    // Clear previous errors
    setErrorMessage("");
     // Pre-validate the invite operation
    if (method === "email" && activeSession) {
      const validation = validateInvite(activeSession, currentUserEmail, email, role);
      if (!validation.valid) {
        setErrorMessage(validation.message);
        return;
      }
    }

    try {
      // Use sessionId for the API call, fallback to id if sessionId doesn't exist
      const sessionIdentifier = activeSession?.sessionId || activeSession?.id;
      
      await inviteUserMutation.mutateAsync({
        sessionId: sessionIdentifier,
        inviteeEmail: email,
        inviterEmail: userEmail,
        role: role // Use role directly instead of converting to access
      });
      
      // Show success toast
      toast.success(`${email} has been invited as ${role}`);
      
      setEmail("");
      onClose();
    } catch (error) {
      console.error("Error sending invite:", error);
      const formattedError = formatPermissionError(error);
      setErrorMessage(formattedError);
      
      toast.error(formattedError);
    }
  };

  const resetForm = () => {
    setEmail("");
    setLink("");
    setMethod("email");
    setRole("viewer");
    setErrorMessage("");
  };

  // Don't render if user doesn't have permission to invite
  if (!canInvite) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent 
        className="sm:max-w-[500px]"
        aria-describedby="invite-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Invite to {activeSession?.name || "Session"}</DialogTitle>
          <DialogDescription id="invite-dialog-description">
            Invite others to join this session by email or generate a sharable link.
          </DialogDescription>
        </DialogHeader>

        {/* Show loading state for session data */}
        {isLoadingSession && open && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Loading session details...</p>
          </div>
        )}

        {/* Show error state for session data */}
        {sessionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading session</AlertTitle>
            <AlertDescription>
              {sessionError.message || "Failed to load session details"}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Show main content when session is available */}
        {activeSession && !isLoadingSession && (
          <>
            <div className="py-4 space-y-4">
              <RadioGroup value={method} onValueChange={setMethod} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email Invite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link">Generate Link</Label>
                </div>
              </RadioGroup>

              {method === "email" && (
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role-select">Role</Label>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ backgroundColor: 'black', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', width: '100%' }}
                >
                  {assignableRoles.includes('viewer') && (
                    <option value="viewer">Viewer (Can only view code)</option>
                  )}
                  {assignableRoles.includes('editor') && (
                    <option value="editor">Editor (Can make changes)</option>
                  )}
                  {assignableRoles.includes('admin') && (
                    <option value="admin">Admin (Can manage participants)</option>
                  )}
                  {/* Owner role cannot be assigned directly through invites */}
                </select>
              </div>

              {method === "link" && (
                <div className="space-y-2">
                  <Button 
                    onClick={generateLink} 
                    className="w-full"
                    variant={isLinkCopied ? "success" : "default"}
                  >
                    {isLinkCopied ? "Copied to Clipboard!" : "Generate & Copy Link"}
                  </Button>
                  {link && (
                    <div className="p-2 bg-gray-100 rounded break-all text-sm bg-dark" style={{ backgroundColor: 'black', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', width: '100%' }}>
                      {link}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeSession?.participants && activeSession.participants.length > 0 && (
              <div className="border-t pt-4">
                <ParticipantsList
                  participants={activeSession.participants}
                  sessionId={activeSession.sessionId || activeSession.id}
                  currentUserEmail={currentUserEmail}
                  currentUserRole={currentUserRole}
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {method === "email" && (
                <Button 
                  onClick={handleSendInvite} 
                  disabled={isSubmitting || !email || !email.includes('@')}
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

InviteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  session: PropTypes.shape({
    id: PropTypes.string,
    sessionId: PropTypes.string,
    name: PropTypes.string,
    participants: PropTypes.array
  }),
  currentUserEmail: PropTypes.string,
  currentUserRole: PropTypes.string,
  userEmail: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};