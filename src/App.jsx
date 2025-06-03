import './App.css'
import CodeWorkspace from './pages/CodeWorkspace'
import LandingPage from './pages/LandingPage'
import { BrowserRouter as Router, Routes, Route } from 'react-router'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import VerificationPage from './pages/VerificationPage'
import CodeCollabWelcome from './components/CodeCollabWelcome'
// import SessionManager from './components/sessions/SessionManager'
import SessionsPage from './pages/SessionsPage'
import DebugPage from './pages/DebugPage'
import PrivateRoute from './components/PrivateRoute';
import QueryProvider from './providers/QueryProvider';

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
              {/* <SessionManager /> */}
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
        <Route path="/welcome" element={<CodeCollabWelcome />} />
      </Routes>
    </Router>
    </QueryProvider>
  );
}

export default App;