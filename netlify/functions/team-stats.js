
exports.handler = async function (event) {
  const API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (!API_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "FOOTBALL_DATA_API_TOKEN is missing in Netlify"
      })
    };
  }

  const homeId = Number(event.queryStringParameters?.home_team_id);
  const awayId = Number(event.queryStringParameters?.away_team_id);

  if (
    !Number.isInteger(homeId) ||
    !Number.isInteger(awayId) ||
    homeId <= 0 ||
    awayId <= 0 ||
    homeId === awayId
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Please provide valid home_team_id and away_team_id"
      })
    };
  }

  try {
    async function getTeamStats(teamId) {
      const today = new Date();
      const dateTo = today.toISOString().slice(0, 10);

      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 365);
      const dateFrom = past.toISOString().slice(0, 10);

      const url = new URL(
        `https://api.football-data.org/v4/teams/${teamId}/matches`
      );

      url.searchParams.set("status", "FINISHED");
      url.searchParams.set("dateFrom", dateFrom);
      url.searchParams.set("dateTo", dateTo);
      url.searchParams.set("limit", "100");

      const response = await fetch(url.toString(), {
        headers: {
          "X-Auth-Token": API_TOKEN
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `football-data.org error ${response.status}: ${
            data.message || data.error || "Unable to retrieve team matches"
          }`
        );
      }

      const completed = (data.matches || [])
        .filter(match =>
          match.status === "FINISHED" &&
          match.score?.fullTime?.home !== null &&
          match.score?.fullTime?.away !== null &&
          match.score?.fullTime?.home !== undefined &&
          match.score?.fullTime?.away !== undefined
        )
        .sort((a, b) =>
          new Date(b.utcDate) - new Date(a.utcDate)
        )
        .slice(0, 5);

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      const matches = completed.map(match => {
        const isHome = match.homeTeam.id === teamId;

        const scored = isHome
          ? match.score.fullTime.home
          : match.score.fullTime.away;

        const conceded = isHome
          ? match.score.fullTime.away
          : match.score.fullTime.home;

        goalsFor += scored;
        goalsAgainst += conceded;

        let result;

        if (scored > conceded) {
          wins++;
          result = "W";
        } else if (scored === conceded) {
          draws++;
          result = "D";
        } else {
          losses++;
          result = "L";
        }

        return {
          opponent: isHome
            ? match.awayTeam.name
            : match.homeTeam.name,
          competition: match.competition?.name || "Unknown",
          date: match.utcDate,
          scored,
          conceded,
          result
        };
      });

      return {
        team_id: teamId,
        team_name: completed.length
          ? (
              completed[0].homeTeam.id === teamId
                ? completed[0].homeTeam.name
                : completed[0].awayTeam.name
            )
          : "Team " + teamId,
        matches_played: matches.length,
        wins,
        draws,
        losses,
        goals_scored: goalsFor,
        goals_conceded: goalsAgainst,
        average_goals_scored: matches.length
          ? Number((goalsFor / matches.length).toFixed(2))
          : 0,
        average_goals_conceded: matches.length
          ? Number((goalsAgainst / matches.length).toFixed(2))
          : 0,
        form: matches.map(match => match.result).join(""),
        recent_matches: matches
      };
    }

    const [home, away] = await Promise.all([
      getTeamStats(homeId),
      getTeamStats(awayId)
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        provider: "football-data.org",
        home_team: home,
        away_team: away
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        provider: "football-data.org",
        error: error.message
      })
    };
  }
};
