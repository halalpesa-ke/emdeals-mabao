
exports.handler = async function (event) {
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
      body: JSON.stringify({
        success: false,
        error: "Please provide valid home_team_id and away_team_id"
      })
    };
  }

  try {
    async function getTeamStats(teamId) {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`,
        {
          headers: {
            "x-apisports-key": API_KEY
          }
        }
      );

      const data = await response.json();

      if (!response.ok || data.errors?.length) {
        throw new Error("Could not retrieve team statistics");
      }

      const completed = (data.response || []).filter(match =>
        ["FT", "AET", "PEN"].includes(match.fixture.status.short)
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      const matches = completed.map(match => {
        const isHome = match.teams.home.id === teamId;

        const scored = isHome
          ? match.goals.home
          : match.goals.away;

        const conceded = isHome
          ? match.goals.away
          : match.goals.home;

        if (scored === null || conceded === null) return null;

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
            ? match.teams.away.name
            : match.teams.home.name,
          scored,
          conceded,
          result
        };
      }).filter(Boolean);

      return {
        team_id: teamId,
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        home_team: home,
        away_team: away
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
