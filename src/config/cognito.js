import { env } from './environment.js';

export const cognitoConfig = {
  UserPoolId: env.AWS_COGNITO_USER_POOL_ID,
  ClientId: env.AWS_COGNITO_CLIENT_ID,
  region: env.AWS_REGION,
};
// Add this validation to help with debugging
if (!cognitoConfig.UserPoolId || !cognitoConfig.ClientId) {
  console.error("Cognito configuration error: Missing UserPoolId or ClientId");
  console.error("UserPoolId:", cognitoConfig.UserPoolId);
  console.error("ClientId:", cognitoConfig.ClientId);
}
