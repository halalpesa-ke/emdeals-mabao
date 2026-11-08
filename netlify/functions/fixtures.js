
exports.handler = async function () {
  const API_KEY = process.env.API_FOOTBALL_KEY;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "API_FOOTBALL_KEY is missing in Netlify environment variables."
      })
    };
  }

  try {
    // Get today's date using UAE time
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    // Request today's football fixtures
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

    // Check API response
    if (!response.ok) {
      throw new Error(
        `Football API HTTP error: ${response.status}`
      );
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(
        JSON.stringify(data.errors)
      );
    }

    // Format match information
    const matches = (data.response || []).map(match => ({
      fixture_id: match.fixture.id,
      date: match.fixture.date,
      timestamp: match.fixture.timestamp,
      timezone: match.fixture.timezone,
      status: match.fixture.status.short,
      status_long: match.fixture.status.long,
      elapsed: match.fixture.status.elapsed,

      league: match.league.name,
      league_id: match.league.id,
      country: match.league.country,
      season: match.league.season,
      round: match.league.round,

      home_team: match.teams.home.name,
      home_team_id: match.teams.home.id,
      home_logo: match.teams.home.logo,
      home_winner: match.teams.home.winner,

      away_team: match.teams.away.name,
      away_team_id: match.teams.away.id,
      away_logo: match.teams.away.logo,
      away_winner: match.teams.away.winner,

      home_score: match.goals.home,
      away_score: match.goals.away,

      halftime_home: match.score.halftime.home,
      halftime_away: match.score.halftime.away,

      fulltime_home: match.score.fulltime.home,
      fulltime_away: match.score.fulltime.away
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        date: today,
        timezone: "Asia/Dubai",
        total: matches.length,
        matches
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
