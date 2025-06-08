import './App.css'
import CodeWorkspace from './pages/CodeWorkspace'
import LandingPage from './pages/LandingPage'
import { BrowserRouter as Router, Routes, Route } from 'react-router'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import VerificationPage from './pages/VerificationPage'
import SessionsPage from './pages/SessionsPage'
import DebugPage from './pages/DebugPage'
// import UserProfileTestPage from './pages/UserProfileTestPage'
import PrivateRoute from './components/PrivateRoute';
import QueryProvider from './providers/QueryProvider';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <QueryProvider>
      <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/workspace"
          element={
            <PrivateRoute>
              <CodeWorkspace />
            </PrivateRoute>
          }
        />

        <Route
          path="/sessions"
          element={
            <PrivateRoute>
              <SessionsPage />
            </PrivateRoute>
          }
        />
        
        {/* Debug Route for TanStack Query Testing */}
        <Route
          path="/debug"
          element={
            <PrivateRoute>
              <DebugPage />
            </PrivateRoute>
          }
        />
        
        <Route path="/verify" element={<VerificationPage />} />
        
        {/* User Profile Test Route */}
        {/* <Route
          path="/user-profile-test"
          element={
            <PrivateRoute>
              <UserProfileTestPage />
            </PrivateRoute>
          }
        /> */}
      </Routes>
      <Toaster />
    </Router>
    </QueryProvider>
  );
}

export default App;