import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleSwitchToSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md">
        <LoginForm 
          onSwitchToSignup={handleSwitchToSignup}
        />
      </div>
    </div>
  );
}
