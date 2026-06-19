const { tournaments, players } = require("../shared/cosmos");
const { getCurrentUserRecord } = require("../shared/auth");

module.exports = async function (context, req) {
  const { user } = await getCurrentUserRecord(req, players);
  if (!user?.isAdmin) {
    context.res = { status: 403, body: "Admins only" };
    return;
  }

  const { tournamentId, matchId } = context.bindingData;
  const { winnerId } = req.body || {};

  const querySpec = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: tournamentId }]
  };

  const { resources } = await tournaments.items.query(querySpec).fetchAll();
  const tournament = resources[0];

  if (!tournament) {
    context.res = { status: 404, body: "Tournament not found" };
    return;
  }

  if (tournament.type !== "single-elimination" || !Array.isArray(tournament.rounds)) {
    context.res = { status: 400, body: "Only single-elimination progression is implemented now" };
    return;
  }

  const rounds = tournament.rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m }))
  }));

  let changed = false;

  for (let i = 0; i < rounds.length; i++) {
    const idx = rounds[i].matches.findIndex((m) => m.id === matchId);
    if (idx === -1) continue;

    rounds[i].matches[idx].winner = winnerId;

    for (let rr = i + 1; rr < rounds.length; rr++) {
      rounds[rr].matches = rounds[rr].matches.map((m) => ({
        ...m,
        p1: null,
        p2: null,
        winner: null
      }));
    }

    for (let r = 0; r < rounds.length - 1; r++) {
      rounds[r].matches.forEach((m, position) => {
        if (m.winner) {
          const next = rounds[r + 1].matches[Math.floor(position / 2)];
          if (position % 2 === 0) next.p1 = m.winner;
          else next.p2 = m.winner;
        }
      });
    }

    changed = true;
    break;
  }

  if (!changed) {
    context.res = { status: 404, body: "Match not found" };
    return;
  }

  const finalMatch = rounds[rounds.length - 1]?.matches?.[0];
  tournament.rounds = rounds;
  tournament.status = finalMatch?.winner ? "completed" : "in-progress";

  await tournaments.item(tournament.id, tournament.season).replace(tournament);
  context.res = { status: 200, body: tournament };
};
