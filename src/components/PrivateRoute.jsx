import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Debugging output to track auth state
  // console.log('PrivateRoute check:', { isAuthenticated, isLoading });

  /**
   * Simple authentication loading skeleton
   * This is only for auth state verification, not data loading
   */
  const renderAuthLoadingSkeleton = () => {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Verifying authentication...</div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    // console.log('PrivateRoute: Loading...');
    return renderAuthLoadingSkeleton();
  }

  if (!isAuthenticated) {
    // console.log('PrivateRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // console.log('PrivateRoute: Authenticated, rendering children');
  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};