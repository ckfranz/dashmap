const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  const accessToken = event.queryStringParameters.accessToken;

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No code provided' }),
    };
  }

  // Make a POST request to exchange the authorization code for an access token
  const tokenUrl = 'https://www.strava.com/oauth/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: accessToken,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri, // The same redirect URI used in the original OAuth request
    }),
  });

  const data = await response.json();

  if (data.errors) {
    return {
      statusCode: 400,
      body: JSON.stringify(data.errors),
    };
  }

  // Return the access token (or handle it as needed, e.g., storing in session)
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
