import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { useCreateSession } from "@/hooks/useSessions";
import { useUser } from '@/contexts/UserContext';

export const CreateSessionDialog = ({ open = false, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { userEmail } = useUser();
  
  // Use TanStack Query mutation directly
  const createSessionMutation = useCreateSession();

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }

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
  };

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
        resetForm();
      }
    }}>
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
            <Label htmlFor="name">Session Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Coding Session"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this session"
              className="bg-black resize-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name.trim() || createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

CreateSessionDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};