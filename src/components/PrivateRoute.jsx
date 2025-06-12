import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  // Debugging output to track auth state
  // console.log('PrivateRoute check:', { isAuthenticated, isLoading, hasUser: !!user });

  if (isLoading) {
    // console.log('PrivateRoute: Loading...');
    return <div>Loading...</div>;
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