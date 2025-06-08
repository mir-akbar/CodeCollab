/**
 * AWS Cognito Service
 * Handles Cognito authentication operations including token refresh
 */

const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

class CognitoService {
  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION || 'ap-south-1'
    });

    this.clientId = process.env.COGNITO_CLIENT_ID;
    this.clientSecret = process.env.COGNITO_CLIENT_SECRET;
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - The refresh token from Cognito
   * @returns {Promise<Object>} - New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      console.log('Starting token refresh with Cognito...');
      
      // For troubleshooting purposes
      console.log('Client ID:', this.clientId ? 'Present' : 'Missing');
      
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          // Secret hash is not needed for refresh token flow with Cognito
        },
      });

      console.log('Sending refresh request to Cognito...');
      const response = await this.client.send(command);
      console.log('Received response from Cognito');
      
      if (!response.AuthenticationResult) {
        console.error('Missing AuthenticationResult in Cognito response');
        throw new Error('Invalid response from authentication service');
      }
      
      return {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        // Refresh token may not be returned if it's still valid
        refreshToken: response.AuthenticationResult.RefreshToken || refreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Generate secret hash for Cognito (if client secret is configured)
   * @param {string} username - The username
   * @returns {string} - Secret hash
   */
  _generateSecretHash(username = '') {
    if (!this.clientSecret) return null;
    
    const crypto = require('crypto');
    const message = username + this.clientId;
    return crypto.createHmac('SHA256', this.clientSecret).update(message).digest('base64');
  }

  /**
   * Validate access token by getting user info
   * @param {string} accessToken - The access token to validate
   * @returns {Promise<Object>} - User information from Cognito
   */
  async validateAccessToken(accessToken) {
    try {
      const { GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
      
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.client.send(command);
      
      // Extract user attributes into a more usable format
      const userAttributes = {};
      response.UserAttributes.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });

      return {
        username: response.Username,
        attributes: userAttributes,
        isValid: true,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }
}

module.exports = new CognitoService();
