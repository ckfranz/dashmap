export async function handler(event, context) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI; // Your local callback URL
  const scope = 'activity:read_all'; // Permissions needed

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&approval_prompt=force`;

  return {
    statusCode: 302,
    headers: {
      Location: stravaAuthUrl, // Redirect to Strava's OAuth URL
    },
  };
}
