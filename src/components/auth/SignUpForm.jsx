/**
 * Modern Sign Up Form with Username Support and Enhanced Password Validation
 * Uses secure AuthContext with TanStack Query and proper token management
 * Features real-time password strength validation matching AWS Cognito policy
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, User, Mail, Lock, Check, X, Shield, AlertCircle } from 'lucide-react';

export function SignUpForm({ onSuccess, onSwitchToLogin }) {
  const { signup, isSigningUp } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordCriteria, setPasswordCriteria] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Real-time password strength validation
  useEffect(() => {
    if (formData.password) {
      const password = formData.password;
      setPasswordCriteria({
        hasMinLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
      });
    } else {
      setPasswordCriteria({
        hasMinLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    }
  }, [formData.password]);

  // Calculate password strength score
  const getPasswordStrength = () => {
    const criteria = Object.values(passwordCriteria);
    const score = criteria.filter(Boolean).length;
    
    if (score === 0) return { level: 'none', label: '', color: '' };
    if (score <= 2) return { level: 'weak', label: 'Weak', color: 'text-red-600 dark:text-red-400' };
    if (score <= 3) return { level: 'fair', label: 'Fair', color: 'text-orange-600 dark:text-orange-400' };
    if (score <= 4) return { level: 'good', label: 'Good', color: 'text-yellow-600 dark:text-yellow-400' };
    return { level: 'strong', label: 'Strong', color: 'text-green-600 dark:text-green-400' };
  };

  const passwordStrength = getPasswordStrength();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Real-time username validation (simplified)
    if (field === 'username') {
      // Basic validation can be added here if needed
    }

    // Auto-generate username from email if username is empty
    if (field === 'email' && !formData.username) {
      const emailPrefix = value.split('@')[0].toLowerCase();
      if (emailPrefix) {
        setFormData(prev => ({ ...prev, username: emailPrefix }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Username validation (optional but must be valid if provided)
    // Note: AWS Cognito requires username to be email format
    // We'll use email as username for Cognito, but still validate display username
    if (formData.username) {
      if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-z0-9._-]+$/.test(formData.username.toLowerCase())) {
        newErrors.username = 'Username can only contain letters, numbers, dots, underscores, and hyphens';
      }
    }

    // Enhanced password validation matching AWS Cognito requirements
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const missingCriteria = [];
      if (!passwordCriteria.hasMinLength) missingCriteria.push('at least 8 characters');
      if (!passwordCriteria.hasUppercase) missingCriteria.push('uppercase letter');
      if (!passwordCriteria.hasLowercase) missingCriteria.push('lowercase letter');
      if (!passwordCriteria.hasNumber) missingCriteria.push('number');
      if (!passwordCriteria.hasSpecialChar) missingCriteria.push('special character');
      
      if (missingCriteria.length > 0) {
        newErrors.password = `Password must contain ${missingCriteria.join(', ')}`;
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await signup({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        username: formData.username.toLowerCase().trim() || undefined,
        password: formData.password,
      });

      console.log('=== SIGNUP RESULT DEBUG ===');
      console.log('Full signup result:', result);
      console.log('result.cognitoUsername:', result.cognitoUsername);
      console.log('result.email:', result.email);

      onSuccess?.({
        email: formData.email,
        cognitoUsername: result.cognitoUsername, // Pass the actual Cognito username
        message: 'Account created! Please check your email for verification.'
      });
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Cognito errors more gracefully
      if (error.code === 'InvalidParameterException') {
        if (error.message.includes('username') && error.message.includes('email')) {
          setErrors(prev => ({
            ...prev,
            email: 'Please ensure your email address is valid'
          }));
        } else if (error.message.includes('format')) {
          setErrors(prev => ({
            ...prev,
            email: 'Invalid email format'
          }));
        } else if (error.message.includes('password')) {
          setErrors(prev => ({
            ...prev,
            password: 'Password does not meet AWS Cognito requirements'
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            email: error.message || 'Invalid parameters provided'
          }));
        }
      } else if (error.code === 'UsernameExistsException') {
        setErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists'
        }));
      } else if (error.code === 'InvalidPasswordException') {
        setErrors(prev => ({
          ...prev,
          password: 'Password does not meet security requirements. Please ensure it meets all criteria above.'
        }));
      } else if (error.code === 'TooManyRequestsException') {
        setErrors(prev => ({
          ...prev,
          email: 'Too many signup attempts. Please try again later.'
        }));
      } else {
        // For other errors, show a general message
        setErrors(prev => ({
          ...prev,
          email: error.message || 'Account creation failed. Please try again.'
        }));
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to create your CodeLab account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* General Error Display */}
        {Object.keys(errors).length > 0 && Object.values(errors).some(error => error) && (
          <div className="mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">
              Please fix the errors below and try again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                disabled={isSigningUp}
              />
            </div>
            {errors.name && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                disabled={isSigningUp}
              />
            </div>
            {errors.email && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your email will be used as your login username
            </p>
          </div>

          {/* Username Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="username">Display Username (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="username"
                type="text"
                placeholder="Choose a display username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`pl-10 ${errors.username ? 'border-red-500' : ''}`}
                disabled={isSigningUp}
              />
            </div>
            {errors.username && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.username}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optional display name - if not provided, we&apos;ll use your email prefix
            </p>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-slate-500 dark:text-slate-300">AWS Cognito Protected</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`pl-10 pr-10 ${
                  errors.password 
                    ? 'border-red-500' 
                    : formData.password && Object.values(passwordCriteria).every(Boolean)
                    ? 'border-green-500'
                    : formData.password
                    ? 'border-orange-400'
                    : ''
                }`}
                disabled={isSigningUp}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSigningUp}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Password Strength:</span>
                  <span className={`text-sm font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                  {passwordStrength.level === 'strong' && (
                    <Check className="h-4 w-4 text-green-500 dark:text-green-400" />
                  )}
                </div>
                
                {/* Password Strength Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.level === 'weak' ? 'bg-red-500 w-1/5' :
                      passwordStrength.level === 'fair' ? 'bg-orange-500 w-2/5' :
                      passwordStrength.level === 'good' ? 'bg-yellow-500 w-3/5' :
                      passwordStrength.level === 'strong' ? 'bg-green-500 w-full' :
                      'w-0'
                    }`}
                  />
                </div>
                
                {/* Password Criteria Checklist */}
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    AWS Cognito Requirements
                  </p>
                  <div className="space-y-1">
                    <PasswordCriterion 
                      met={passwordCriteria.hasMinLength} 
                      text="At least 8 characters" 
                    />
                    <PasswordCriterion 
                      met={passwordCriteria.hasUppercase} 
                      text="One uppercase letter (A-Z)" 
                    />
                    <PasswordCriterion 
                      met={passwordCriteria.hasLowercase} 
                      text="One lowercase letter (a-z)" 
                    />
                    <PasswordCriterion 
                      met={passwordCriteria.hasNumber} 
                      text="One number (0-9)" 
                    />
                    <PasswordCriterion 
                      met={passwordCriteria.hasSpecialChar} 
                      text="One special character (!@#$%^&*)" 
                    />
                  </div>
                  
                  {Object.values(passwordCriteria).every(Boolean) && (
                    <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Perfect! Your password meets all requirements
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {errors.password && (
              <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{errors.password}</p>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`pl-10 pr-10 ${
                  errors.confirmPassword 
                    ? 'border-red-500' 
                    : formData.confirmPassword && formData.password === formData.confirmPassword
                    ? 'border-green-500'
                    : formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-300'
                    : ''
                }`}
                disabled={isSigningUp}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSigningUp}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                )}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="flex items-center gap-2 mt-2">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                    <span className="text-sm text-red-600 dark:text-red-400">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
            
            {errors.confirmPassword && (
              <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{errors.confirmPassword}</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={
              isSigningUp || 
              !formData.name.trim() ||
              !formData.email ||
              !formData.password ||
              !formData.confirmPassword ||
              !Object.values(passwordCriteria).every(Boolean) ||
              formData.password !== formData.confirmPassword
            }
          >
            {isSigningUp ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Switch to Login */}
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                disabled={isSigningUp}
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Password Criterion Component for visual feedback
function PasswordCriterion({ met, text }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <X className="h-3 w-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
      )}
      <span className={`text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {text}
      </span>
    </div>
  );
}

PasswordCriterion.propTypes = {
  met: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
};

SignUpForm.propTypes = {
  onSuccess: PropTypes.func,
  onSwitchToLogin: PropTypes.func,
};
