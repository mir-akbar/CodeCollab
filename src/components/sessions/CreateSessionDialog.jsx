import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from "uuid";
import { API_URL } from "@/common/Constant";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export const CreateSessionDialog = ({ open = false, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    const email = localStorage.getItem("email");
    
    try {
      // Use onCreate prop which should use the new API
      const result = await onCreate({
        name: name.trim(),
        description: description.trim(),
        creator: email
      });

      if (result.success) {
        toast({
          title: "Session Created", 
          description: "Your new session has been created" 
        });
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Creation Failed", 
        description: error.message || "Failed to create session",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPrivate(false);
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
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

CreateSessionDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired
};