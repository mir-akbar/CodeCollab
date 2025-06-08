import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dateFormatter";
import PropTypes from "prop-types";
import { useDeleteSession } from "@/hooks/useSessions";
import { toast } from "sonner";
import { useUser } from '@/contexts/UserContext';

export const DeleteDialog = ({ open = false, session = null, onClose }) => {
  const { userEmail } = useUser();
  
  // Use TanStack Query mutation directly
  const deleteSessionMutation = useDeleteSession();

  const handleDelete = async () => {
    if (!session?.sessionId && !session?.id) {
      return;
    }

    try {
      await deleteSessionMutation.mutateAsync({
        sessionId: session.sessionId || session.id,
        userEmail: userEmail
      });

      toast.success("Session deleted successfully");
      
      onClose();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error(error.message || "Failed to delete session");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
        aria-describedby="delete-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Delete Session</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Are you sure you want to delete this session? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{session?.name}</strong>?</p>
          <div className="text-sm text-gray-500">
            Created {formatDate(session?.createdAt)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteSessionMutation.isPending}
          >
            {deleteSessionMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

DeleteDialog.propTypes = {
  open: PropTypes.bool,
  session: PropTypes.shape({
    id: PropTypes.string,
    sessionId: PropTypes.string,
    name: PropTypes.string,
    createdAt: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};