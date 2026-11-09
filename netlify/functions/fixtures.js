
exports.handler = async function () {
  const API_KEY = process.env.API_FOOTBALL_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  const send = (statusCode, data) => ({
    statusCode,
    headers,
    body: JSON.stringify(data)
  });

  if (!API_KEY) {
    return send(500, {
      success: false,
      error: "API_FOOTBALL_KEY is missing in Netlify."
    });
  }

  try {
    // Get today's date in UAE time
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    // Request today's fixtures
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    const data = await response.json();

    // Check API errors
    if (!response.ok || (data.errors && Object.keys(data.errors).length > 0)) {
      return send(502, {
        success: false,
        date: today,
        error: data.errors || `Football API error: ${response.status}`,
        matches: []
      });
    }

    // Format fixtures
    const matches = (data.response || []).map(item => ({
      fixtureId: item.fixture.id,
      date: item.fixture.date,
      timestamp: item.fixture.timestamp,
      status: item.fixture.status.short,
      statusLong: item.fixture.status.long,

      league: item.league.name,
      country: item.league.country,
      leagueLogo: item.league.logo,

      home: item.teams.home.name,
      away: item.teams.away.name,

      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,

      homeId: item.teams.home.id,
      awayId: item.teams.away.id,

      homeLogo: item.teams.home.logo,
      awayLogo: item.teams.away.logo,

      homeGoals: item.goals.home,
      awayGoals: item.goals.away,

      venue: item.fixture.venue.name || "TBA"
    }));

    return send(200, {
      success: true,
      date: today,
      total: matches.length,
      matches
    });

  } catch (error) {
    return send(500, {
      success: false,
      error: error.message,
      matches: []
    });
  }
};
