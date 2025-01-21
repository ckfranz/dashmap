import fetch from 'node-fetch';

export async function handler(event) {
  const { afterDate, beforeDate, accessToken } = JSON.parse(event.body);

  if (!afterDate || !beforeDate || !accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields: afterDate, beforeDate, or accessToken',
      }),
    };
  }

  const stravaApiUrl = 'https://www.strava.com/api/v3';

  try {
    // Convert dates to Unix timestamps (seconds)
    const after = Math.floor(new Date(afterDate).getTime() / 1000);
    const before = Math.floor(new Date(beforeDate).getTime() / 1000) + 86400;

    // Fetch activities from the Strava API
    const response = await fetch(
      `${stravaApiUrl}/athlete/activities?after=${after}&before=${before}&page=1&per_page=5`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to fetch activities' }),
      };
    }

    const activities = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(activities),
    };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
