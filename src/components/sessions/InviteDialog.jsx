import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { encryptData } from "@/utils/encryption";
import { ParticipantsList } from "./ParticipantsList";
import PropTypes from "prop-types";

export const InviteDialog = ({ open = false, session = null, onClose, onInviteSent }) => {
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState("view");
  const [method, setMethod] = useState("email");
  const [link, setLink] = useState("");
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateLink = () => {
    const encryptedAccess = encodeURIComponent(encryptData(access));
    const sessionId = encodeURIComponent(session.sessionId);
    const baseUrl = window.location.origin;
    const newLink = `${baseUrl}/workspace?session=${sessionId}&access=${encryptedAccess}`;
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
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onInviteSent(session.id, email, access);
      setEmail("");
      onClose();
    } catch (error) {
      console.error("Error sending invite:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setLink("");
    setMethod("email");
    setAccess("view");
  };

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
          <DialogTitle>Invite to {session?.name}</DialogTitle>
          <DialogDescription id="invite-dialog-description">
            Invite others to join this session by email or generate a sharable link.
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="access-level">Access Level</Label>
            <select
              id="access-level"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              style={{ backgroundColor: 'black', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', width: '100%' }}
            >
              <option value="view">View (Can only view code)</option>
              <option value="edit">Edit (Can make changes)</option>
              {/* <option value="admin">Admin (Full control)</option> */}
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

        {session?.participants && session.participants.length > 0 && (
          <div className="border-t pt-4">
            <ParticipantsList
              participants={session.participants}
              sessionId={session.id}
              onUpdateAccess={onInviteSent}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {method === "email" && (
            <Button 
              onClick={handleSendInvite} 
              disabled={!email || !email.includes('@') || isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

InviteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  session: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    participants: PropTypes.array
  }),
  onClose: PropTypes.func.isRequired,
  onInviteSent: PropTypes.func.isRequired
};