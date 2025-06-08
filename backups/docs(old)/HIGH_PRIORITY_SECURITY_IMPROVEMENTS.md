# High-Priority Security Improvements Implementation Guide
## TanStack Query + Secure Authentication Integration

## Overview

This document outlines the implementation steps for critical security improvements to the CodeLab authentication system, specifically designed for the **TanStack Query + Zustand** architecture currently in use. These improvements address vulnerabilities identified in the security assessment and follow industry best practices for web application security.

## Executive Summary

The current authentication system uses localStorage for token storage and relies on axios interceptors with TanStack Query for API management. This is vulnerable to XSS attacks. This guide provides step-by-step implementation for:

1. **Secure Token Storage**: Move from localStorage to HttpOnly cookies with TanStack Query integration
2. **CSRF Protection**: Implement Cross-Site Request Forgery protection with query client integration
3. **Rate Limiting**: Add authentication rate limiting and account lockout
4. **Session Security**: Enhance session timeout and invalidation with automatic query cache clearing

## TanStack Query Architecture Considerations

Your current implementation uses:
- **TanStack Query v5** for server state management
- **Axios interceptors** in `src/utils/api.js` for authentication headers
- **Session management hooks** in `src/hooks/useSessions.js`
- **Real-time integration** with YJS via `src/hooks/useRealTimeSession.js`
- **Optimistic updates** and intelligent caching throughout the application

## 1. Secure Token Storage Implementation

### Current Issue
- JWT tokens stored in localStorage are accessible via JavaScript
- Vulnerable to XSS attacks
- No automatic token expiration handling

### Solution: HttpOnly Cookies with Automatic Refresh

#### Step 1: Backend Cookie Implementation

**File: `api/middleware/auth.js`**

```javascript
// Add cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS in production
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes for access token
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
  path: '/api/auth/refresh', // Restrict refresh token scope
};

// Middleware to set secure cookies
export const setAuthCookies = (req, res, tokens) => {
  res.cookie('accessToken', tokens.accessToken, cookieOptions);
  res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
  res.cookie('csrfToken', generateCSRFToken(), {
    ...cookieOptions,
    httpOnly: false, // CSRF token needs to be accessible to frontend
  });
};

// Middleware to clear auth cookies
export const clearAuthCookies = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('csrfToken');
};
```

#### Step 2: Update Authentication Routes

**File: `api/routes/auth.js`**

```javascript
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate rate limiting
    if (await isRateLimited(email)) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.' 
      });
    }

    // Authenticate with Cognito
    const tokens = await authenticateWithCognito(email, password);
    
    // Set secure cookies
    setAuthCookies(req, res, tokens);
    
    // Clear any failed attempts
    await clearFailedAttempts(email);
    
    res.json({ 
      success: true, 
      user: { email },
      csrfToken: req.cookies.csrfToken 
    });
  } catch (error) {
    await recordFailedAttempt(req.ip, email);
    res.status(401).json({ error: error.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  clearAuthCookies(req, res);
  res.json({ success: true });
});

// Token refresh endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const newTokens = await refreshCognitoTokens(refreshToken);
    setAuthCookies(req, res, newTokens);
    
    res.json({ success: true });
  } catch (error) {
    clearAuthCookies(req, res);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

#### Step 3: Update Frontend Authentication for TanStack Query

**File: `src/utils/auth.js`**

```javascript
// Remove localStorage operations and use API calls with TanStack Query integration
import { useQueryClient } from '@tanstack/react-query';
import { sessionKeys } from '../hooks/useSessions';

export const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    
    // Store CSRF token for future requests
    sessionStorage.setItem('csrfToken', data.csrfToken);
    
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const logout = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': sessionStorage.getItem('csrfToken'),
      },
    });
    
    sessionStorage.removeItem('csrfToken');
    
    // Clear TanStack Query cache on logout
    const queryClient = useQueryClient();
    queryClient.clear();
    
    // Redirect to login page
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    // Force logout even if API call fails
    sessionStorage.clear();
    
    // Still clear cache on forced logout
    try {
      const queryClient = useQueryClient();
      queryClient.clear();
    } catch (e) {
      // If query client not available, continue
    }
    
    window.location.href = '/login';
  }
};

// Automatic token refresh integrated with TanStack Query
export const setupTokenRefresh = () => {
  // Refresh token every 14 minutes (before 15-minute expiry)
  setInterval(async () => {
    try {
      await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Clear TanStack Query cache on refresh failure
      try {
        const queryClient = useQueryClient();
        queryClient.clear();
      } catch (e) {
        // If query client not available, continue
      }
      
      // Redirect to login if refresh fails
      window.location.href = '/login';
    }
  }, 14 * 60 * 1000);
};

export const isAuthenticated = async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// TanStack Query-aware authentication hook
export const useAuthenticationStatus = () => {
  const queryClient = useQueryClient();
  
  const handleAuthFailure = useCallback(() => {
    // Clear all cached data
    queryClient.clear();
    
    // Clear local storage
    localStorage.removeItem('email');
    sessionStorage.removeItem('csrfToken');
    
    // Redirect to login
    window.location.href = '/login';
  }, [queryClient]);
  
  const checkAuthStatus = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: handleAuthFailure
  });
  
  return {
    isAuthenticated: checkAuthStatus.data || false,
    isLoading: checkAuthStatus.isLoading,
    isError: checkAuthStatus.isError,
    refetch: checkAuthStatus.refetch,
    handleAuthFailure
  };
};
```

### Step 4: Session Management Hooks Integration

**File: `src/hooks/useSessions.js` (Update existing session hooks for enhanced security)**

```javascript
// ...existing imports...
import { useAuthenticationStatus } from '../utils/auth.js';

// Enhanced session actions with security integration
export const useSessionActions = (userEmail) => {
  const authStatus = useAuthenticationStatus();
  
  // All existing mutations with added security checks
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const joinSession = useJoinSession();
  const leaveSession = useLeaveSession();
  const inviteToSession = useInviteToSession();
  
  // Security-enhanced wrapper functions
  const secureCreateSession = useCallback(async (sessionData) => {
    if (!authStatus.isAuthenticated) {
      authStatus.handleAuthFailure();
      return;
    }
    
    try {
      return await createSession.mutateAsync(sessionData);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        authStatus.handleAuthFailure();
      }
      throw error;
    }
  }, [createSession, authStatus]);
  
  const secureDeleteSession = useCallback(async (sessionId) => {
    if (!authStatus.isAuthenticated) {
      authStatus.handleAuthFailure();
      return;
    }
    
    try {
      return await deleteSession.mutateAsync(sessionId);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        authStatus.handleAuthFailure();
      }
      throw error;
    }
  }, [deleteSession, authStatus]);
  
  return {
    createSession: secureCreateSession,
    deleteSession: secureDeleteSession,
    joinSession,
    leaveSession,
    inviteToSession,
    authStatus
  };
};
```

## 3. Rate Limiting and Account Lockout

### Current Issue
- No protection against brute force attacks
- Unlimited login attempts allowed
- No account lockout mechanism

### Solution: Intelligent Rate Limiting with TanStack Query Integration

### Step 1: Backend Rate Limiting Store

**File: `api/utils/rateLimiter.js`**

```javascript
// In-memory store for rate limiting (consider Redis for production)
const attemptStore = new Map();
const lockoutStore = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export const recordFailedAttempt = async (ip, email) => {
  const key = `${ip}:${email}`;
  const now = Date.now();
  
  let attempts = attemptStore.get(key) || [];
  
  // Remove attempts older than the window
  attempts = attempts.filter(timestamp => now - timestamp < ATTEMPT_WINDOW);
  
  // Add current attempt
  attempts.push(now);
  attemptStore.set(key, attempts);
  
  // Check if lockout threshold reached
  if (attempts.length >= MAX_ATTEMPTS) {
    lockoutStore.set(key, now + LOCKOUT_DURATION);
    
    // Log security event
    console.warn(`Account locked for ${email} from IP ${ip} after ${attempts.length} failed attempts`);
    
    return { locked: true, lockoutUntil: now + LOCKOUT_DURATION };
  }
  
  return { locked: false, attemptsRemaining: MAX_ATTEMPTS - attempts.length };
};

export const isRateLimited = async (ip, email) => {
  const key = `${ip}:${email}`;
  const lockoutUntil = lockoutStore.get(key);
  
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return true;
  }
  
  // Clean up expired lockouts
  if (lockoutUntil && Date.now() >= lockoutUntil) {
    lockoutStore.delete(key);
    attemptStore.delete(key);
  }
  
  return false;
};

export const getRemainingAttempts = async (ip, email) => {
  const key = `${ip}:${email}`;
  const attempts = attemptStore.get(key) || [];
  const now = Date.now();
  
  // Filter recent attempts
  const recentAttempts = attempts.filter(timestamp => now - timestamp < ATTEMPT_WINDOW);
  
  return Math.max(0, MAX_ATTEMPTS - recentAttempts.length);
};

export const clearAttempts = async (ip, email) => {
  const key = `${ip}:${email}`;
  attemptStore.delete(key);
  lockoutStore.delete(key);
};
```

### Step 2: Rate Limiting Middleware with TanStack Query Headers

**File: `api/middleware/rateLimiter.js`**

```javascript
import { isRateLimited, getRemainingAttempts } from '../utils/rateLimiter.js';

export const loginRateLimit = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const email = req.body.email;
  
  if (await isRateLimited(ip, email)) {
    // Set headers for frontend to handle gracefully
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 900); // 15 minutes
    res.set('X-RateLimit-Limit', '5');
    
    return res.status(429).json({
      error: 'Too many failed login attempts. Account temporarily locked.',
      retryAfter: 15 * 60, // seconds
      lockoutUntil: Date.now() + (15 * 60 * 1000),
      type: 'RATE_LIMITED'
    });
  }
  
  const remaining = await getRemainingAttempts(ip, email);
  res.set('X-RateLimit-Remaining', remaining.toString());
  res.set('X-RateLimit-Limit', '5');
  
  next();
};

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    type: 'API_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain endpoints
    return req.path.startsWith('/api/health') ||
           req.path.startsWith('/api/auth/verify');
  },
  onLimitReached: (req, res, options) => {
    console.warn(`API rate limit exceeded for IP: ${req.ip}`);
  }
});
```

### Step 3: Frontend Rate Limiting Integration

**File: `src/utils/auth.js` (Enhanced login with rate limiting awareness)**

```javascript
// ...existing imports...
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Enhanced login function with rate limiting handling
export const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
      const lockoutUntil = data.lockoutUntil;
      
      throw new Error(`Account temporarily locked due to multiple failed attempts. Try again ${
        lockoutUntil ? `at ${new Date(lockoutUntil).toLocaleTimeString()}` : 'in 15 minutes'
      }`);
    }
    
    if (!response.ok) {
      // Get remaining attempts from headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining && parseInt(remaining) <= 2) {
        throw new Error(`${data.error}. ${remaining} attempts remaining before account lockout.`);
      }
      throw new Error(data.error || 'Login failed');
    }
    
    // Store CSRF token from successful login
    if (data.csrfToken) {
      sessionStorage.setItem('csrfToken', data.csrfToken);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// TanStack Query hook for login with rate limiting awareness
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (data) => {
      // Clear any existing session cache
      queryClient.invalidateQueries(['auth']);
      queryClient.invalidateQueries(['sessions']);
      
      // Navigate to dashboard or redirect URL
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      window.location.href = redirect || '/dashboard';
    },
    onError: (error) => {
      // Handle specific rate limiting errors in UI
      if (error.message.includes('temporarily locked')) {
        // Show special UI for locked accounts
        console.error('Account locked:', error.message);
      }
    }
  });
};
```

## 4. Session Security Enhancement with TanStack Query

### Current Issue
- No automatic session timeout
- No suspicious activity detection
- No proper session invalidation

### Solution: Comprehensive Session Security

### Step 1: Session Timeout with TanStack Query Integration

**File: `src/hooks/useSessionTimeout.js`**

```javascript
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '../utils/auth.js';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const EXTEND_SESSION_TIME = 25 * 60 * 1000; // Extend session at 25 minutes

export const useSessionTimeout = () => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const extendRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  
  const handleSessionExtension = useCallback(async () => {
    try {
      // Extend session by refreshing token
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('Session extended automatically');
        
        // Invalidate auth queries to refresh status
        queryClient.invalidateQueries(['auth']);
        
        return true;
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
    return false;
  }, [queryClient]);
  
  const handleSessionWarning = useCallback(() => {
    const shouldContinue = window.confirm(
      'Your session will expire in 5 minutes due to inactivity. Do you want to continue working?'
    );
    
    if (shouldContinue) {
      handleSessionExtension();
      resetTimeout();
    } else {
      // User chose not to continue
      handleLogout();
    }
  }, [handleSessionExtension]);
  
  const handleLogout = useCallback(async () => {
    // Clear all cached data before logout
    queryClient.clear();
    
    // Show session expired message
    alert('Your session has expired due to inactivity. You will be logged out for security.');
    
    await logout();
  }, [queryClient]);
  
  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (extendRef.current) clearTimeout(extendRef.current);
    
    // Set automatic session extension (silent renewal)
    extendRef.current = setTimeout(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // Only extend if user has been active recently
      if (timeSinceActivity < EXTEND_SESSION_TIME) {
        await handleSessionExtension();
        resetTimeout(); // Reset the cycle
      }
    }, EXTEND_SESSION_TIME);
    
    // Set warning timeout
    warningRef.current = setTimeout(handleSessionWarning, SESSION_TIMEOUT - WARNING_TIME);
    
    // Set logout timeout
    timeoutRef.current = setTimeout(handleLogout, SESSION_TIMEOUT);
  }, [handleSessionWarning, handleLogout, handleSessionExtension]);
  
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimeoutHandler = () => {
      lastActivityRef.current = Date.now();
      resetTimeout();
    };
    
    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, resetTimeoutHandler, true);
    });
    
    // Initialize timeout on mount
    resetTimeout();
    
    // Cleanup on unmount
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeoutHandler, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (extendRef.current) clearTimeout(extendRef.current);
    };
  }, [resetTimeout]);
  
  return {
    resetTimeout,
    extendSession: handleSessionExtension,
    lastActivity: lastActivityRef.current
  };
};
```

### Step 2: Suspicious Activity Detection with Session Invalidation

**File: `api/middleware/securityMonitoring.js`**

```javascript
const suspiciousActivity = new Map();
const securityEvents = new Map();

// Configurable thresholds
const SECURITY_THRESHOLDS = {
  RAPID_REQUESTS: 100,      // requests per minute
  MAX_LOCATIONS: 3,         // different countries
  UNUSUAL_HOURS: [0, 6],    // 12AM - 6AM local time
  SESSION_SWITCHES: 5       // session switches per hour
};

export const detectSuspiciousActivity = (req, res, next) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const userId = req.user?.id || req.headers['x-user-email'];
  const sessionKey = `${userId}:${ip}`;
  
  // Track session patterns
  const activity = suspiciousActivity.get(sessionKey) || {
    requests: 0,
    firstSeen: Date.now(),
    lastRequest: Date.now(),
    locations: new Set(),
    userAgents: new Set(),
    requestPatterns: []
  };
  
  const now = Date.now();
  const timeDiff = now - activity.lastRequest;
  
  // Update activity tracking
  activity.requests++;
  activity.lastRequest = now;
  activity.userAgents.add(userAgent);
  activity.requestPatterns.push({
    timestamp: now,
    endpoint: req.path,
    method: req.method
  });
  
  // Keep only recent patterns (last hour)
  const oneHourAgo = now - 60 * 60 * 1000;
  activity.requestPatterns = activity.requestPatterns.filter(p => p.timestamp > oneHourAgo);
  
  // Geographic location tracking (if available)
  const country = req.headers['cf-ipcountry'] || req.headers['x-country'];
  if (country) {
    activity.locations.add(country);
  }
  
  // Detect suspicious patterns
  const flags = [];
  
  // 1. Rapid requests (more than threshold per minute)
  const recentRequests = activity.requestPatterns.filter(p => now - p.timestamp < 60000);
  if (recentRequests.length > SECURITY_THRESHOLDS.RAPID_REQUESTS) {
    flags.push('RAPID_REQUESTS');
  }
  
  // 2. Multiple locations
  if (activity.locations.size > SECURITY_THRESHOLDS.MAX_LOCATIONS) {
    flags.push('MULTIPLE_LOCATIONS');
  }
  
  // 3. Multiple user agents (possible bot)
  if (activity.userAgents.size > 3) {
    flags.push('MULTIPLE_USER_AGENTS');
  }
  
  // 4. Unusual time patterns
  const hour = new Date().getHours();
  const isUnusualHour = hour >= SECURITY_THRESHOLDS.UNUSUAL_HOURS[0] && 
                       hour <= SECURITY_THRESHOLDS.UNUSUAL_HOURS[1];
  if (isUnusualHour && recentRequests.length > 10) {
    flags.push('UNUSUAL_HOURS');
  }
  
  // 5. Bot-like patterns (regular intervals)
  if (activity.requestPatterns.length > 10) {
    const intervals = [];
    for (let i = 1; i < activity.requestPatterns.length; i++) {
      intervals.push(activity.requestPatterns[i].timestamp - activity.requestPatterns[i-1].timestamp);
    }
    
    // Check if intervals are suspiciously regular (variance < 100ms)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    if (variance < 10000 && avgInterval < 5000) { // Very regular, very fast
      flags.push('BOT_PATTERN');
    }
  }
  
  suspiciousActivity.set(sessionKey, activity);
  
  // Handle suspicious activity
  if (flags.length > 0) {
    const securityEvent = {
      userId,
      ip,
      userAgent,
      flags,
      timestamp: now,
      activitySummary: {
        requests: activity.requests,
        locations: Array.from(activity.locations),
        userAgents: activity.userAgents.size,
        patterns: activity.requestPatterns.length
      }
    };
    
    // Log security event
    console.warn(`🚨 SECURITY ALERT: Suspicious activity detected`, securityEvent);
    
    // Store security event
    const eventKey = `${userId}:${now}`;
    securityEvents.set(eventKey, securityEvent);
    
    // Determine response based on severity
    const severity = flags.length;
    
    if (severity >= 3 || flags.includes('BOT_PATTERN')) {
      // High severity: block request and force re-auth
      res.set('X-Security-Action', 'BLOCK');
      return res.status(429).json({
        error: 'Suspicious activity detected. Access temporarily restricted.',
        requiresReauth: true,
        securityFlags: flags,
        retryAfter: 300 // 5 minutes
      });
    } else if (severity >= 2) {
      // Medium severity: require additional verification
      res.set('X-Security-Action', 'VERIFY');
      res.set('X-Security-Flags', flags.join(','));
      req.requiresVerification = true;
    } else {
      // Low severity: log but allow
      res.set('X-Security-Action', 'MONITOR');
      res.set('X-Security-Flags', flags.join(','));
      req.suspiciousActivity = true;
    }
  }
  
  next();
};

// Cleanup old security events
setInterval(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  for (const [key, event] of securityEvents) {
    if (event.timestamp < oneDayAgo) {
      securityEvents.delete(key);
    }
  }
  
  for (const [key, activity] of suspiciousActivity) {
    if (activity.firstSeen < oneDayAgo) {
      suspiciousActivity.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export const getSecurityEvents = (userId) => {
  const events = [];
  for (const [key, event] of securityEvents) {
    if (event.userId === userId) {
      events.push(event);
    }
  }
  return events.sort((a, b) => b.timestamp - a.timestamp);
};
```

### Step 3: Frontend Security Integration

**File: `src/hooks/useSecurity.js`**

```javascript
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionTimeout } from './useSessionTimeout.js';
import { logout } from '../utils/auth.js';

export const useSecurity = () => {
  const queryClient = useQueryClient();
  const sessionTimeout = useSessionTimeout();
  const [securityStatus, setSecurityStatus] = useState({
    isSecure: true,
    flags: [],
    lastCheck: Date.now()
  });
  
  // Monitor for security headers in API responses
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check for security headers
      const securityAction = response.headers.get('X-Security-Action');
      const securityFlags = response.headers.get('X-Security-Flags');
      
      if (securityAction) {
        console.log(`Security action detected: ${securityAction}`);
        
        setSecurityStatus(prev => ({
          ...prev,
          flags: securityFlags ? securityFlags.split(',') : [],
          lastCheck: Date.now()
        }));
        
        // Handle security actions
        switch (securityAction) {
          case 'BLOCK':
            alert('Suspicious activity detected. You will be logged out for security.');
            queryClient.clear();
            await logout();
            break;
            
          case 'VERIFY':
            // Could implement additional verification here
            console.warn('Additional verification required:', securityFlags);
            break;
            
          case 'MONITOR':
            console.info('Security monitoring active:', securityFlags);
            break;
        }
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [queryClient]);
  
  // Periodic security check
  useEffect(() => {
    const securityCheck = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/security-check', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.status === 401) {
          // Session expired
          queryClient.clear();
          await logout();
        }
        
        setSecurityStatus(prev => ({
          ...prev,
          isSecure: response.ok,
          lastCheck: Date.now()
        }));
        
      } catch (error) {
        console.error('Security check failed:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(securityCheck);
  }, [queryClient]);
  
  return {
    securityStatus,
    sessionTimeout,
    forceLogout: async () => {
      queryClient.clear();
      await logout();
    }
  };
};
```

### Step 4: Session Management Component Integration

**File: `src/components/sessions/SessionManager.jsx` (Add security integration)**

```javascript
// ...existing imports...
import { useSecurity } from '../../hooks/useSecurity.js';

export function SessionManager({ userEmail }) {
  // ...existing session management logic...
  const security = useSecurity();
  
  // Show security status in debug mode
  const showSecurityStatus = import.meta.env.DEV;
  
  return (
    <div>
      {/* Existing session management UI */}
      
      {showSecurityStatus && (
        <div className="mt-4 p-3 bg-blue-50 rounded border">
          <h4 className="font-medium text-blue-800">🔒 Security Status</h4>
          <div className="text-sm text-blue-600 mt-2">
            <p>Status: {security.securityStatus.isSecure ? '✅ Secure' : '⚠️ Monitoring'}</p>
            <p>Session Timeout: Active</p>
            <p>Last Activity: {new Date(security.sessionTimeout.lastActivity).toLocaleTimeString()}</p>
            {security.securityStatus.flags.length > 0 && (
              <p>Flags: {security.securityStatus.flags.join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```
