/**
 * Singleton Permission Manager for Video Calls
 * Ensures only one permission dialog is shown across the entire application
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import PropTypes from "prop-types";

// Singleton permission manager
class PermissionManager {
  constructor() {
    this.status = null;
    this.isChecking = false;
    this.hasChecked = false;
    this.activeComponent = null;
    this.subscribers = new Set();
  }

  subscribe(component, callback) {
    // Only allow one active component
    if (this.activeComponent && this.activeComponent !== component) {
      return () => {}; // Return noop unsubscribe for inactive components
    }
    
    this.activeComponent = component;
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
      if (this.activeComponent === component) {
        this.activeComponent = null;
      }
    };
  }

  notify() {
    this.subscribers.forEach(callback => callback({
      status: this.status,
      isChecking: this.isChecking
    }));
  }

  async checkPermissions() {
    if (this.hasChecked || this.isChecking) {
      return this.status;
    }

    this.isChecking = true;
    this.hasChecked = true;
    this.notify();

    try {
      const permissions = await navigator.permissions?.query({ name: 'camera' });
      const micPermissions = await navigator.permissions?.query({ name: 'microphone' });
      
      this.status = {
        camera: permissions?.state || 'prompt',
        microphone: micPermissions?.state || 'prompt'
      };
    } catch {
      console.log('Permission API not supported, will request on call start');
      this.status = { camera: 'prompt', microphone: 'prompt' };
    }

    this.isChecking = false;
    this.notify();
    return this.status;
  }

  async requestPermissions() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.status = { camera: 'granted', microphone: 'granted' };
      this.notify();
      return this.status;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        this.status = { camera: 'denied', microphone: 'denied' };
      }
      this.notify();
      throw error;
    }
  }
}

const permissionManager = new PermissionManager();

// Single Permission Check Component
export function SingletonPermissionCheck({ onPermissionGranted, isLoading, renderWrapper }) {
  const [state, setState] = useState({
    status: permissionManager.status,
    isChecking: permissionManager.isChecking
  });
  const [componentId] = useState(() => Math.random().toString(36));

  useEffect(() => {
    const unsubscribe = permissionManager.subscribe(componentId, setState);

    // Check permissions if not already checked
    if (!permissionManager.hasChecked && !permissionManager.isChecking) {
      permissionManager.checkPermissions();
    }

    return unsubscribe;
  }, [componentId]);

  const requestPermissions = async () => {
    try {
      await permissionManager.requestPermissions();
      toast.success("Permissions granted! You can now start a video call.");
      onPermissionGranted?.();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error("Camera/microphone access denied. Please allow permissions in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No camera or microphone found. Please connect a device.");
      } else {
        toast.error("Failed to access camera/microphone. Please check your device settings.");
      }
    }
  };

  // Don't render if this is not the active component
  if (permissionManager.activeComponent && permissionManager.activeComponent !== componentId) {
    const content = null;
    return renderWrapper ? renderWrapper(content) : content;
  }

  if (state.isChecking) {
    const content = (
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
    return renderWrapper ? renderWrapper(content) : content;
  }

  if (state.status?.camera === 'denied' || state.status?.microphone === 'denied') {
    const content = (
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <h3 className="font-semibold text-red-800 mb-2">Permissions Denied</h3>
          <p className="text-sm text-red-600 mb-4">
            Camera and microphone access is required for video calls. Please allow permissions in your browser settings and refresh the page.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
    return renderWrapper ? renderWrapper(content) : content;
  }

  if (state.status?.camera === 'granted' && state.status?.microphone === 'granted') {
    // Don't render anything if permissions are already granted - user can just start the call
    const content = null;
    return renderWrapper ? renderWrapper(content) : content;
  }

  if (state.status?.camera === 'prompt' || state.status?.microphone === 'prompt') {
    const content = (
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <h3 className="font-medium text-blue-800 mb-1">Camera & Mic Access Required</h3>
          <p className="text-xs text-blue-600 mb-3">
            Grant permissions to start video calls
          </p>
          <Button onClick={requestPermissions} disabled={isLoading} size="sm">
            {isLoading ? "Requesting..." : "Grant Access"}
          </Button>
        </div>
      </div>
    );
    return renderWrapper ? renderWrapper(content) : content;
  }

  const content = null;
  return renderWrapper ? renderWrapper(content) : content;
}

SingletonPermissionCheck.propTypes = {
  onPermissionGranted: PropTypes.func,
  isLoading: PropTypes.bool,
  renderWrapper: PropTypes.func
};
