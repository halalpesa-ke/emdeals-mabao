
exports.handler = async function () {
  const API_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "API_FOOTBALL_KEY is missing in Netlify"
      })
    };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok || data.errors?.length) {
      throw new Error("Football API request failed");
    }

    const matches = (data.response || []).map(match => ({
      fixture_id: match.fixture.id,
      date: match.fixture.date,
      status: match.fixture.status.short,

      league: match.league.name,
      league_id: match.league.id,
      country: match.league.country,
      season: match.league.season,

      home_team: match.teams.home.name,
      home_team_id: match.teams.home.id,
      home_logo: match.teams.home.logo,

      away_team: match.teams.away.name,
      away_team_id: match.teams.away.id,
      away_logo: match.teams.away.logo,

      home_score: match.goals.home,
      away_score: match.goals.away
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        date: today,
        total: matches.length,
        matches
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
