/**
 * Notification Store
 * Centralizes toast notifications, alerts, and system messages
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';

const useNotificationStore = create()(
  devtools(
    (set, get) => ({
      // Notification queue and history
      notifications: [],
      maxNotifications: 100,
      
      // Settings
      settings: {
        enableToasts: true,
        enableSounds: false,
        position: 'top-right', // for future customization
        duration: {
          success: 4000,
          error: 6000,
          info: 3000,
          warning: 5000
        }
      },

      // Notification counters
      stats: {
        total: 0,
        success: 0,
        error: 0,
        warning: 0,
        info: 0
      },

      // === MAIN NOTIFICATION METHODS ===
      
      /**
       * Show success notification
       * @param {string} message - Success message
       * @param {Object} options - Additional options
       */
      success: (message, options = {}) => {
        const notification = get().createNotification('success', message, options);
        
        if (get().settings.enableToasts) {
          toast.success(message, {
            duration: options.duration || get().settings.duration.success,
            ...options
          });
        }
        
        get().addToHistory(notification);
        get().incrementStat('success');
        
        return notification.id;
      },

      /**
       * Show error notification
       * @param {string} message - Error message  
       * @param {Object} options - Additional options
       */
      error: (message, options = {}) => {
        const notification = get().createNotification('error', message, options);
        
        if (get().settings.enableToasts) {
          toast.error(message, {
            duration: options.duration || get().settings.duration.error,
            ...options
          });
        }
        
        get().addToHistory(notification);
        get().incrementStat('error');
        
        return notification.id;
      },

      /**
       * Show info notification
       * @param {string} message - Info message
       * @param {Object} options - Additional options
       */
      info: (message, options = {}) => {
        const notification = get().createNotification('info', message, options);
        
        if (get().settings.enableToasts) {
          toast.info(message, {
            duration: options.duration || get().settings.duration.info,
            ...options
          });
        }
        
        get().addToHistory(notification);
        get().incrementStat('info');
        
        return notification.id;
      },

      /**
       * Show warning notification
       * @param {string} message - Warning message
       * @param {Object} options - Additional options
       */
      warning: (message, options = {}) => {
        const notification = get().createNotification('warning', message, options);
        
        if (get().settings.enableToasts) {
          toast.warning(message, {
            duration: options.duration || get().settings.duration.warning,
            ...options
          });
        }
        
        get().addToHistory(notification);
        get().incrementStat('warning');
        
        return notification.id;
      },

      // === COLLABORATION-SPECIFIC HELPERS ===
      
      /**
       * Show user joined notification
       * @param {string} userName - Name of user who joined
       * @param {string} sessionName - Name of session
       */
      userJoined: (userName, sessionName) => {
        return get().info(`${userName} joined ${sessionName}`, {
          category: 'collaboration',
          actions: ['View Session']
        });
      },

      /**
       * Show user left notification
       * @param {string} userName - Name of user who left
       * @param {string} sessionName - Name of session
       */
      userLeft: (userName, sessionName) => {
        return get().info(`${userName} left ${sessionName}`, {
          category: 'collaboration',
          duration: 2000 // Shorter for less important events
        });
      },

      /**
       * Show file operation notifications
       * @param {string} operation - 'uploaded' | 'deleted' | 'modified'
       * @param {string} fileName - Name of the file
       * @param {string} userName - User who performed the action
       */
      fileOperation: (operation, fileName, userName) => {
        const messages = {
          uploaded: `${userName} uploaded ${fileName}`,
          deleted: `${userName} deleted ${fileName}`,
          modified: `${userName} modified ${fileName}`
        };
        
        const type = operation === 'deleted' ? 'warning' : 'info';
        return get()[type](messages[operation] || `File ${operation}: ${fileName}`, {
          category: 'file-operation'
        });
      },

      /**
       * Show permission/role change notifications
       * @param {string} userEmail - Email of user whose role changed
       * @param {string} newRole - New role assigned
       * @param {string} sessionName - Session where role changed
       */
      roleChanged: (userEmail, newRole, sessionName) => {
        return get().success(`${userEmail} is now ${newRole} in ${sessionName}`, {
          category: 'permission'
        });
      },

      /**
       * Show invitation notifications
       * @param {string} email - Invited user email
       * @param {boolean} userExisted - Whether user already had an account
       */
      invitationSent: (email, userExisted = true) => {
        const message = userExisted 
          ? `Invitation sent to ${email}`
          : `Invitation sent to ${email}! They'll be able to join when they create an account.`;
        
        return get().success(message, {
          category: 'invitation',
          duration: userExisted ? 4000 : 6000
        });
      },

      // === CONNECTION STATUS HELPERS ===
      
      /**
       * Show connection status notifications
       * @param {string} status - 'connected' | 'disconnected' | 'reconnecting'
       * @param {string} context - Additional context
       */
      connectionStatus: (status, context = '') => {
        const messages = {
          connected: `Connected ${context}`,
          disconnected: `Disconnected ${context}`,
          reconnecting: `Reconnecting ${context}...`
        };
        
        const type = status === 'connected' ? 'success' : 
                    status === 'disconnected' ? 'error' : 'info';
        
        return get()[type](messages[status], {
          category: 'connection',
          duration: status === 'reconnecting' ? 2000 : undefined
        });
      },

      // === UTILITY METHODS ===
      
      /**
       * Create notification object (internal)
       */
      createNotification: (type, message, options) => ({
        id: Date.now() + Math.random(),
        type,
        message,
        timestamp: Date.now(),
        category: options.category || 'general',
        actions: options.actions || [],
        metadata: options.metadata || {}
      }),

      /**
       * Add notification to history
       */
      addToHistory: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, state.maxNotifications)
      })),

      /**
       * Increment statistics
       */
      incrementStat: (type) => set((state) => ({
        stats: {
          ...state.stats,
          total: state.stats.total + 1,
          [type]: state.stats[type] + 1
        }
      })),

      // === SETTINGS ACTIONS ===
      
      /**
       * Update notification settings
       * @param {Object} newSettings - Settings to update
       */
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      /**
       * Toggle toast notifications on/off
       */
      toggleToasts: () => set((state) => ({
        settings: { ...state.settings, enableToasts: !state.settings.enableToasts }
      })),

      // === HISTORY MANAGEMENT ===
      
      /**
       * Clear notification history
       */
      clearHistory: () => set({ notifications: [] }),

      /**
       * Get notifications by category
       * @param {string} category - Category to filter by
       */
      getByCategory: (category) => {
        return get().notifications.filter(n => n.category === category);
      },

      /**
       * Get recent notifications (last N)
       * @param {number} count - Number of recent notifications
       */
      getRecent: (count = 10) => {
        return get().notifications.slice(0, count);
      },

      /**
       * Get notifications by type
       * @param {string} type - Type to filter by
       */
      getByType: (type) => {
        return get().notifications.filter(n => n.type === type);
      },

      // === BULK OPERATIONS ===
      
      /**
       * Show multiple notifications (useful for batch operations)
       * @param {Array} notificationList - Array of {type, message, options}
       */
      showMultiple: (notificationList) => {
        notificationList.forEach(({ type, message, options }) => {
          get()[type](message, options);
        });
      },

      /**
       * Reset all stats
       */
      resetStats: () => set({
        stats: { total: 0, success: 0, error: 0, warning: 0, info: 0 }
      })
    }),
    { name: 'NotificationStore' }
  )
);

export { useNotificationStore };
