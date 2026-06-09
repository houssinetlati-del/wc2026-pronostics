exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Essaie d'abord football-data.org
    const r = await fetch('https://api.football-data.org/v4/competitions/WC/matches?season=2026', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
    });

    if (r.ok) {
      const data = await r.json();
      const matches = (data.matches || []).map(m => ({
        id: m.id,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        date: m.utcDate,
        status: m.status, // SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED
        score: m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED' ? {
          h: m.score.fullTime.home,
          a: m.score.fullTime.away
        } : null,
        group: m.group || null
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'football-data', matches }) };
    }

    // Fallback: worldcup26.ir (gratuit, sans auth)
    const r2 = await fetch('https://worldcup26.ir/get/games');
    if (r2.ok) {
      const data2 = await r2.json();
      return { statusCode: 200, headers, body: JSON.stringify({ source: 'worldcup26', matches: data2 }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ source: 'none', matches: [] }) };

  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: e.message, matches: [] }) };
  }
};
