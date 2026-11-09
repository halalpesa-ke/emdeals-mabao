
exports.handler = async function () {
  const API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

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

  if (!API_TOKEN) {
    return send(500, {
      success: false,
      error: "FOOTBALL_DATA_API_TOKEN is missing in Netlify.",
      matches: []
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

    // Request today's matches from football-data.org
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`,
      {
        method: "GET",
        headers: {
          "X-Auth-Token": API_TOKEN
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return send(response.status, {
        success: false,
        error: data.message || data.error || "Football data API request failed.",
        matches: []
      });
    }

    // Format matches for EMDeals Mabao
    const matches = (data.matches || []).map(match => ({
      fixtureId: match.id,
      id: match.id,

      date: match.utcDate,
      timestamp: new Date(match.utcDate).getTime(),

      status: match.status,
      matchday: match.matchday,

      league: match.competition?.name || "Unknown",
      competition: match.competition?.name || "Unknown",
      leagueCode: match.competition?.code || "",
      leagueLogo: match.competition?.emblem || "",

      country: match.area?.name || "",

      home: match.homeTeam?.name || "Unknown",
      away: match.awayTeam?.name || "Unknown",

      homeTeam: match.homeTeam?.name || "Unknown",
      awayTeam: match.awayTeam?.name || "Unknown",

      homeId: match.homeTeam?.id || null,
      awayId: match.awayTeam?.id || null,

      homeLogo: match.homeTeam?.crest || "",
      awayLogo: match.awayTeam?.crest || "",

      homeGoals: match.score?.fullTime?.home ?? null,
      awayGoals: match.score?.fullTime?.away ?? null,

      halfTimeHome: match.score?.halfTime?.home ?? null,
      halfTimeAway: match.score?.halfTime?.away ?? null,

      venue: match.venue || "TBA"
    }));

    return send(200, {
      success: true,
      provider: "football-data.org",
      date: today,
      total: matches.length,
      matches: matches
    });

  } catch (error) {
    return send(500, {
      success: false,
      error: error.message,
      matches: []
    });
  }
};
