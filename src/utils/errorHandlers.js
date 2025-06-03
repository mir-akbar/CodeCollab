/**
 * Error handling utilities for CodeLab
 * Provides consistent error handling throughout the application
 */

import { formatPermissionError } from './permissionValidation';

/**
 * Handle API errors uniformly
 * @param {Error} error - Error object from API call
 * @param {Function} toast - Toast notification function
 * @param {Function} [setError] - Optional state setter for error message
 * @param {string} [context='API'] - Context of the error for logging
 */
export const handleApiError = (error, toast, setError = null, context = 'API') => {
  console.error(`${context} Error:`, error);
  
  // Format message based on type of error
  let message;
  
  // Permission-related errors
  if (error.response?.status === 403 || 
      error.message?.toLowerCase().includes('permission') ||
      error.response?.data?.error?.toLowerCase().includes('permission')) {
    message = formatPermissionError(error);
  }
  // Not found errors
  else if (error.response?.status === 404) {
    message = 'The requested resource was not found';
  }
  // Authentication errors
  else if (error.response?.status === 401) {
    message = 'You are not authorized to perform this action';
  }
  // Server errors
  else if (error.response?.status >= 500) {
    message = 'Something went wrong on the server. Please try again later';
  }
  // Other error responses
  else if (error.response?.data?.error) {
    message = error.response.data.error;
  }
  // Network errors
  else if (error.message === 'Network Error') {
    message = 'Network error. Please check your connection';
  }
  // Generic error fallback
  else {
    message = error.message || 'An unknown error occurred';
  }
  
  // Update state if setter provided
  if (setError) {
    setError(message);
  }
  
  // Show toast notification if available
  if (toast) {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive'
    });
  }
  
  return message;
};

/**
 * Show error and success messages when validation is involved
 * @param {Function} validationFn - Validation function to run
 * @param {Object} params - Parameters for validation function
 * @param {Function} apiCallFn - API call function to run if validation passes
 * @param {Object} apiParams - Parameters for API call
 * @param {Function} toast - Toast function for notifications
 * @param {Object} messages - Custom messages { success, error }
 * @returns {Promise<boolean>} - Success status
 */
export const validateAndExecute = async (
  validationFn, 
  validationParams, 
  apiCallFn,
  apiParams,
  toast,
  messages = {}
) => {
  // Run validation
  const validation = validationFn(...Object.values(validationParams));
  
  if (!validation.valid) {
    toast({
      title: 'Action Blocked',
      description: validation.message,
      variant: 'destructive'
    });
    return false;
  }
  
  // Proceed with API call
  try {
    await apiCallFn(...Object.values(apiParams));
    
    // Show success notification
    if (messages.success) {
      toast({
        title: 'Success',
        description: messages.success
      });
    }
    
    return true;
  } catch (error) {
    // Use common error handling
    handleApiError(
      error, 
      toast, 
      null, 
      messages.errorContext || 'Operation'
    );
    return false;
  }
};
