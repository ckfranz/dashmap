const fetch = require('node-fetch');

exports.handler = async function (event) {
  const { activityId, accessToken } = JSON.parse(event.body);

  if (!activityId || !accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing activityId or accessToken' }),
    };
  }

  const stravaApiUrl = 'https://www.strava.com/api/v3';

  try {
    const response = await fetch(
      `${stravaApiUrl}/activities/${activityId}/streams?keys=latlng&key_by_type=true`,
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
        body: JSON.stringify({ error: 'Failed to fetch streams' }),
      };
    }

    const stream = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(stream.latlng || null),
    };
  } catch (error) {
    console.error('Error fetching streams:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
