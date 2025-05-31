import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/utils/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for URL parameters that might contain session information
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session');
    const user = searchParams.get('user');
    const access = searchParams.get('access');

    // If we have session params, store them to redirect after login
    if (sessionId) {
      localStorage.setItem('pendingSessionId', sessionId);
      if (user) localStorage.setItem('pendingSessionUser', user);
      if (access) localStorage.setItem('pendingSessionAccess', access);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.newPasswordRequired) {
        // Handle new password required case
        navigate("/reset-password", { state: { email } });
        return;
      }
      
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("idToken", result.idToken);
      localStorage.setItem("email", email);
      localStorage.setItem("isLoggedIn", "true");
      
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
        
        navigate(`/workspace?${params.toString()}`);
      } else {
        // Regular redirect to sessions page
        navigate("/sessions");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle different Cognito error types
      switch (err.code) {
        case 'UserNotConfirmedException':
          setError("Please verify your account first");
          navigate('/verify', { state: { email } });
          break;
        case 'PasswordResetRequiredException':
          setError("You need to reset your password");
          navigate('/reset-password', { state: { email } });
          break;
        case 'NotAuthorizedException':
          setError("Incorrect username or password");
          break;
        case 'UserNotFoundException':
          setError("User does not exist");
          break;
        default:
          setError(err.message || "An error occurred during login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-2">Sign in to continue to CodeLab</p>
      </div>
      
      {error && (
        <div className="p-3 rounded-md bg-red-500/20 border border-red-500 text-red-300">
          {error}
        </div>
      )}
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="bg-[#2d2d2d] border-[#444] text-gray-200"
            required
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Link to="/reset-password" className="text-sm text-blue-400 hover:text-blue-300">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-[#2d2d2d] border-[#444] text-gray-200"
            required
          />
        </div>
        
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <div className="text-center">
        <p className="text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}