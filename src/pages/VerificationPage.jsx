import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';

export default function VerificationPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { confirmRegistration, resendVerificationCode, isResendingCode } = useAuth();
  
  // Get email and cognitoUsername from navigation state
  const email = location.state?.email || '';
  const cognitoUsername = location.state?.cognitoUsername || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('No verification email found. Please sign up first.');
      return;
    }

    setIsLoading(true);
    try {
      // Use cognitoUsername if available, fallback to email for older flows
      await confirmRegistration({ 
        email, 
        code, 
        username: cognitoUsername || email 
      });
      // Success - AuthContext will handle navigation
      navigate('/login', { 
        state: { 
          verified: true,
          message: 'Email verified successfully! You can now log in.'
        } 
      });
    } catch (err) {
      console.error('Email verification failed:', err);
      
      // Handle specific error cases
      if (err.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new code.');
      } else if (err.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please check and try again.');
      } else {
        setError(err.message || 'Verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    
    console.log('=== FRONTEND RESEND DEBUG ===');
    console.log('Email from state:', email);
    console.log('CognitoUsername from state:', cognitoUsername);
    console.log('Location state full:', location.state);
    console.log('Will call resendVerificationCode with:', { 
      email, 
      username: cognitoUsername || email 
    });
    
    try {
      const result = await resendVerificationCode({ 
        email, 
        username: cognitoUsername || email 
      });
      console.log('=== FRONTEND RESEND SUCCESS ===');
      console.log('Resend code result:', result);
      setSuccessMessage('Verification code sent! Please check your email.');
    } catch (err) {
      console.log('=== FRONTEND RESEND ERROR ===');
      console.error('Failed to resend verification code:', err);
      setError(err.message || 'Failed to resend verification code');
    }
  };

  if (!email) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Verification Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No verification email found. Please sign up first.</p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => navigate('/signup')}
            >
              Go to Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Verify Email</CardTitle>
          <CardDescription>
            Enter the verification code sent to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(''); // Clear error when user starts typing
                    setSuccessMessage(''); // Clear success message when user starts typing
                  }}
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
              {error && (
                <div className="space-y-2">
                  <p className="text-red-500 text-sm">{error}</p>
                  {error.includes('expired') && (
                    <p className="text-gray-500 text-xs">
                      Click &quot;Resend Verification Code&quot; below to get a new code.
                    </p>
                  )}
                </div>
              )}
              {successMessage && (
                <p className="text-green-500 text-sm">{successMessage}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Account'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={handleResendCode} 
              disabled={isResendingCode}
            >
              {isResendingCode ? 'Resending...' : 'Resend Verification Code'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}