export const cognitoConfig = {
  UserPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
};
// Add this validation to help with debugging
if (!cognitoConfig.UserPoolId || !cognitoConfig.ClientId) {
  console.error("Cognito configuration error: Missing UserPoolId or ClientId");
  console.error("UserPoolId:", cognitoConfig.UserPoolId);
  console.error("ClientId:", cognitoConfig.ClientId);
}
