import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dateFormatter";
import PropTypes from "prop-types";

export const DeleteDialog = ({ open = false, session = null, onClose, onConfirm }) => {
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
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

DeleteDialog.propTypes = {
  session: PropTypes.shape({
    name: PropTypes.string,
    createdAt: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired
};