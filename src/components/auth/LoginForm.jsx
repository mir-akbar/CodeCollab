/**
 * Modern Login Form
 * Uses secure AuthContext with TanStack Query and proper token management
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export function LoginForm({ onSuccess, onSwitchToSignup }) {
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email or Username validation
    if (!formData.emailOrUsername) {
      newErrors.emailOrUsername = 'Email or username is required';
    }
    // Remove strict email validation since we support usernames too

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      // Determine if input is email or username
      const isEmail = formData.emailOrUsername.includes('@');
      
      await login({
        email: isEmail ? formData.emailOrUsername.toLowerCase().trim() : undefined,
        username: !isEmail ? formData.emailOrUsername.toLowerCase().trim() : undefined,
        password: formData.password,
      });

      console.log('Login successful, auth state should be updated');

      // Handle success - either callback or navigation
      if (onSuccess) {
        onSuccess();
      } else {
        // Check if we have a pending session to join
        const pendingSessionId = localStorage.getItem('pendingSessionId');
        if (pendingSessionId) {
          const pendingUser = localStorage.getItem('pendingSessionUser');
          const pendingAccess = localStorage.getItem('pendingSessionAccess');
          
          // Clear the pending session data
          localStorage.removeItem('pendingSessionId');
          localStorage.removeItem('pendingSessionUser');
          localStorage.removeItem('pendingSessionAccess');
          
          // Redirect to the workspace with session parameters
          const params = new URLSearchParams();
          params.set('session', pendingSessionId);
          if (pendingUser) params.set('user', pendingUser);
          if (pendingAccess) params.set('access', pendingAccess);
          
          console.log('Navigating to workspace with session:', pendingSessionId);
          navigate(`/workspace?${params.toString()}`);
        } else {
          // Redirect to sessions page
          console.log('Navigating to sessions page...');
          navigate('/sessions');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle different Cognito error types
      switch (err.code) {
        case 'UserNotConfirmedException': {
          setError('Please verify your account first');
          // For navigation, use email if available, otherwise the input value
          const emailForVerify = formData.emailOrUsername.includes('@') ? formData.emailOrUsername : undefined;
          if (navigate && emailForVerify) navigate('/verify', { state: { email: emailForVerify } });
          break;
        }
        case 'PasswordResetRequiredException': {
          setError('You need to reset your password');
          const emailForReset = formData.emailOrUsername.includes('@') ? formData.emailOrUsername : undefined;
          if (navigate && emailForReset) navigate('/reset-password', { state: { email: emailForReset } });
          break;
        }
        case 'NotAuthorizedException':
          setError('Incorrect email or password');
          break;
        case 'UserNotFoundException':
          setError('No account found with this email or username');
          break;
        case 'TooManyRequestsException':
          setError('Too many login attempts. Please try again later.');
          break;
        case 'InvalidParameterException':
          if (err.message.includes('format')) {
            setError('Invalid email format');
          } else {
            setError(err.message || 'Invalid parameters provided');
          }
          break;
        default:
          setError(err.message || 'An error occurred during login');
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Enter your email or username and password to access your CodeLab account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Email or Username Field */}
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email or Username</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Enter your email or username"
                value={formData.emailOrUsername}
                onChange={(e) => handleInputChange('emailOrUsername', e.target.value)}
                className={`pl-10 ${errors.emailOrUsername ? 'border-red-500' : ''}`}
                disabled={isLoggingIn}
                autoComplete="username"
              />
            </div>
            {errors.emailOrUsername && (
              <p className="text-sm text-red-500">{errors.emailOrUsername}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoggingIn}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Signing In...' : 'Sign In'}
          </Button>

          {/* Switch to Signup */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-500 font-medium"
                disabled={isLoggingIn}
              >
                Create one
              </button>
            </p>
            
            {/* Forgot Password Link - TODO: Implement */}
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={isLoggingIn}
              onClick={() => {
                // TODO: Implement forgot password flow
                alert('Forgot password feature coming soon!');
              }}
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
