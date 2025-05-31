import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      
      // Navigate to session manager instead of workspace
      navigate("/sessions");
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
    <div className="w-full max-w-md mx-auto space-y-6 p-6 border border-[#333] rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-2">Sign in to continue to CodeCollab</p>
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
            className="text-gray-200"
            required
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Link to="/reset-password" className="text-sm">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className=" text-gray-200"
            required
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <div className="text-center">
        <p className="text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-white hover:text-gray-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}