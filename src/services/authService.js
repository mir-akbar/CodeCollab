/**
 * Authentication Service - Pure functions for Cognito operations
 * Separated from React components for better maintainability
 */

import { 
  CognitoUserPool, 
  CognitoUser, 
  AuthenticationDetails,
  CognitoUserAttribute 
} from 'amazon-cognito-identity-js';

// Cognito Configuration
const poolData = {
  UserPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
};

const userPool = new CognitoUserPool(poolData);

/**
 * Get current authenticated user from Cognito
 */
export async function getCurrentCognitoUser() {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();
    
    if (!cognitoUser) {
      reject(new Error('No authenticated user'));
      return;
    }

    cognitoUser.getSession(async (err, session) => {
      if (err) {
        reject(err);
        return;
      }

      if (!session.isValid()) {
        reject(new Error('Invalid session'));
        return;
      }

      try {
        // Get user attributes from Cognito
        const attributes = await getCognitoUserAttributes(cognitoUser);
        resolve(attributes);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Sign up new user with Cognito
 */
export async function signupWithCognito({ name, email, password, username }) {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: 'name', Value: name }),
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];

    // Note: preferred_username cannot be set during signup for unconfirmed accounts
    // when user pool is configured with email alias. It can be set after confirmation.

    // Generate a unique username (not email format) since user pool has email alias
    // Users will be able to sign in with their email due to email alias configuration
    const cognitoUsername = username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    userPool.signUp(cognitoUsername, password, attributes, null, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({
        user: result.user,
        userConfirmed: result.userConfirmed,
        userSub: result.userSub,
        email, // Include email for future reference
        displayUsername: username, // Include display username for future reference
        cognitoUsername, // Include the actual Cognito username used
      });
    });
  });
}

/**
 * Login user with Cognito
 * Supports both email and username login due to email alias configuration
 */
export async function loginWithCognito({ email, password, username }) {
  return new Promise((resolve, reject) => {
    // Use username if provided, otherwise use email
    // Email alias allows login with email even if username was used during signup
    const loginIdentifier = username || email;
    
    const authenticationData = {
      Username: loginIdentifier,
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const userData = {
      Username: loginIdentifier,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const tokens = {
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
          expiresIn: result.getAccessToken().getExpiration() - Date.now() / 1000
        };
        resolve({ tokens, user: cognitoUser });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Confirm user registration
 * Supports both email and username for confirmation
 */
export async function confirmRegistrationWithCognito({ email, code, username }) {
  return new Promise((resolve, reject) => {
    // Use username if provided, otherwise use email
    const confirmationIdentifier = username || email;
    
    const cognitoUser = new CognitoUser({
      Username: confirmationIdentifier,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Logout user from Cognito
 */
export async function logoutFromCognito() {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  return Promise.resolve();
}

/**
 * Get Cognito user attributes
 */
function getCognitoUserAttributes(cognitoUser) {
  return new Promise((resolve, reject) => {
    cognitoUser.getUserAttributes((err, attributes) => {
      if (err) {
        reject(err);
        return;
      }

      const userInfo = {};
      attributes.forEach(attr => {
        userInfo[attr.getName()] = attr.getValue();
      });

      resolve(userInfo);
    });
  });
}

/**
 * Extract user data from Cognito JWT tokens for backend sync
 */
export function extractCognitoDataFromTokens(tokens) {
  try {
    // Decode ID token (contains user attributes)
    const idTokenPayload = JSON.parse(atob(tokens.idToken.split('.')[1]));
    
    return {
      sub: idTokenPayload.sub,
      email: idTokenPayload.email,
      name: idTokenPayload.name,
      given_name: idTokenPayload.given_name,
      family_name: idTokenPayload.family_name,
      preferred_username: idTokenPayload.preferred_username,
      email_verified: idTokenPayload.email_verified
    };
  } catch (error) {
    console.error('Failed to extract Cognito data from tokens:', error);
    throw new Error('Invalid token format');
  }
}

/**
 * Update user attributes (can be used after confirmation)
 */
export async function updateUserAttributes(attributes) {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      reject(new Error('No authenticated user'));
      return;
    }

    user.getSession((err) => {
      if (err) {
        reject(err);
        return;
      }

      const cognitoAttributes = attributes.map(attr => 
        new CognitoUserAttribute({ Name: attr.Name, Value: attr.Value })
      );

      user.updateAttributes(cognitoAttributes, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });
}

/**
 * Resend verification code for user
 */
export async function resendVerificationCode({ email, username }) {
  return new Promise((resolve, reject) => {
    // Use username if provided, otherwise use email
    const identifier = username || email;
    
    console.log('=== RESEND VERIFICATION CODE DEBUG ===');
    console.log('Email:', email);
    console.log('Username:', username);
    console.log('Using identifier:', identifier);
    console.log('Pool config:', poolData);
    
    const cognitoUser = new CognitoUser({
      Username: identifier,
      Pool: userPool,
    });

    console.log('Created CognitoUser object, calling resendConfirmationCode...');

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        console.error('=== COGNITO RESEND ERROR ===');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        reject(err);
        return;
      }
      console.log('=== COGNITO RESEND SUCCESS ===');
      console.log('Result:', result);
      console.log('CodeDeliveryDetails:', result?.CodeDeliveryDetails);
      resolve(result);
    });
  });
}

export { userPool };
