import { useNavigate } from 'react-router-dom';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  const navigate = useNavigate();

  const handleSignupSuccess = (data) => {
    console.log('=== SIGNUP PAGE NAVIGATION DEBUG ===');
    console.log('Data received from SignUpForm:', data);
    console.log('data.cognitoUsername:', data.cognitoUsername);
    
    // Navigate to verification page with both email and cognitoUsername
    navigate('/verify', { 
      state: { 
        email: data.email,
        cognitoUsername: data.cognitoUsername, // Pass the actual Cognito username
        message: data.message 
      } 
    });
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md">
        <SignUpForm 
          onSuccess={handleSignupSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </div>
    </div>
  );
}

