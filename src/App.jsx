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
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
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
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/welcome" element={<CodeCollabWelcome />} />
      </Routes>
    </Router>
  );
}

export default App;