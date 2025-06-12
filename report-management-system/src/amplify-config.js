// report-management-system/src/amplify-config.js
const amplifyConfig = {
  Auth: {
    region: 'us-east-1_REPLACE_ME', // Replace with your Cognito region
    userPoolId: 'us-east-1_REPLACE_ME_xxxxxxxxx', // Replace with your User Pool ID
    userPoolWebClientId: 'REPLACE_ME_xxxxxxxxxxxxxxxxxxxxxx', // Replace with your App Client ID
    // OPTIONAL - Hosted UI configuration
    // oauth: {
    //   domain: 'your-cognito-domain.auth.us-east-1.amazoncognito.com',
    //   scope: ['email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
    //   redirectSignIn: 'http://localhost:8080/',
    //   redirectSignOut: 'http://localhost:8080/login/',
    //   responseType: 'code'
    // }
  }
  // You can add other categories like API, Storage here later
};
export default amplifyConfig;
