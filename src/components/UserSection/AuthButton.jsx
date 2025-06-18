import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import PropTypes from 'prop-types';

export function AuthButton({ handleLogout, navigate }) {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Button 
      onClick={handleLogout}
      variant="outline" 
      className="border-red-500 text-red-500 hover:bg-red-500/10 gap-2"
    >
      <LogOut size={16} />
      Logout
    </Button>
  ) : (
    <Button 
      onClick={() => navigate('/login')}
      variant="outline" 
      className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
    >
      Login
    </Button>
  );
}

AuthButton.propTypes = {
  handleLogout: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired
};
