const { tournaments, players } = require("../shared/cosmos");
const { getCurrentUserRecord } = require("../shared/auth");

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function buildSingleElimination(selectedPlayers) {
  const sorted = [...selectedPlayers].sort((a, b) => b.elo - a.elo);
  const bracketSize = nextPowerOfTwo(Math.max(2, sorted.length));
  const slots = [...sorted];
  while (slots.length < bracketSize) slots.push(null);

  const roundCount = Math.log2(bracketSize);
  const roundLabels = ["Final", "Semifinals", "Quarterfinals", "Round of 16", "Round of 32"];

  const rounds = [];
  for (let r = 0; r < roundCount; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    const label = roundLabels[roundCount - 1 - r] || `Round ${r + 1}`;
    rounds.push({
      name: label,
      matches: Array.from({ length: matchCount }, (_, i) => ({
        id: `m-${Date.now()}-${r}-${i}`,
        p1: null,
        p2: null,
        winner: null
      }))
    });
  }

  const firstRound = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1 = slots[i];
    const p2 = slots[bracketSize - 1 - i];
    firstRound.push({
      id: `m-${Date.now()}-0-${i}`,
      p1: p1?.id || null,
      p2: p2?.id || null,
      winner: p1 && !p2 ? p1.id : !p1 && p2 ? p2.id : null
    });
  }
  rounds[0].matches = firstRound;

  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].matches.forEach((m, index) => {
      if (m.winner) {
        const next = rounds[r + 1].matches[Math.floor(index / 2)];
        if (index % 2 === 0) next.p1 = m.winner;
        else next.p2 = m.winner;
      }
    });
  }

  return rounds;
}

module.exports = async function (context, req) {
  const { user } = await getCurrentUserRecord(req, players);
  if (!user?.isAdmin) {
    context.res = { status: 403, body: "Admins only" };
    return;
  }

  const { name, season, type, playerIds } = req.body || {};

  if (!name || !season || !type || !Array.isArray(playerIds) || playerIds.length < 2) {
    context.res = { status: 400, body: "Invalid tournament input" };
    return;
  }

  const allPlayers = [];
  for (const id of playerIds) {
    const { resource } = await players.item(id, id).read();
    if (resource) allPlayers.push(resource);
  }

  let tournament;

  if (type === "single-elimination") {
    tournament = {
      id: `t-${Date.now()}`,
      name,
      season,
      type,
      status: "upcoming",
      playerIds,
      rounds: buildSingleElimination(allPlayers),
      createdAt: new Date().toISOString()
    };
  } else if (type === "double-elimination") {
    tournament = {
      id: `t-${Date.now()}`,
      name,
      season,
      type,
      status: "upcoming",
      playerIds,
      structure: {
        winnersBracketRounds: Math.ceil(Math.log2(playerIds.length)),
        losersBracketRounds: Math.ceil(Math.log2(playerIds.length)) * 2 - 1,
        grandFinal: true
      },
      createdAt: new Date().toISOString()
    };
  } else {
    tournament = {
      id: `t-${Date.now()}`,
      name,
      season,
      type: "swiss",
      status: "upcoming",
      playerIds,
      roundCount: Math.max(3, Math.ceil(Math.log2(playerIds.length))),
      standingsPreview: playerIds.map((id) => ({ playerId: id, points: 0 })),
      createdAt: new Date().toISOString()
    };
  }

  await tournaments.items.create(tournament);
  context.res = { status: 200, body: tournament };
};
