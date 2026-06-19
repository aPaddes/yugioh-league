const { players, duels, eloHistory } = require("../shared/cosmos");
const { calculate } = require("../shared/elo");
const { parseClientPrincipal } = require("../shared/auth");

module.exports = async function (context, req) {
  const principal = parseClientPrincipal(req);
  if (!principal?.userId) {
    context.res = { status: 401, body: "Not authenticated" };
    return;
  }

  const { p1Id, p2Id, winnerId, format, notes, season } = req.body || {};

  if (!p1Id || !p2Id || !winnerId || p1Id === p2Id) {
    context.res = { status: 400, body: "Invalid duel input" };
    return;
  }

  const { resource: p1 } = await players.item(p1Id, p1Id).read();
  const { resource: p2 } = await players.item(p2Id, p2Id).read();

  const winner = winnerId === p1.id ? p1 : p2;
  const loser = winnerId === p1.id ? p2 : p1;

  const updated = calculate(winner.elo, loser.elo);
  const winnerDelta = updated.winner - winner.elo;
  const loserDelta = updated.loser - loser.elo;

  winner.elo = updated.winner;
  winner.wins = (winner.wins || 0) + 1;

  loser.elo = updated.loser;
  loser.losses = (loser.losses || 0) + 1;

  await players.item(winner.id, winner.id).replace(winner);
  await players.item(loser.id, loser.id).replace(loser);

  const duel = {
    id: `d-${Date.now()}`,
    season: season || "2026-S1",
    date: new Date().toISOString().slice(0, 10),
    p1: p1Id,
    p2: p2Id,
    winner: winnerId,
    format: format || "Goat",
    notes: notes || "",
    submittedBy: principal.userId,
    eloChange: {
      winner: winnerDelta,
      loser: loserDelta
    }
  };

  await duels.items.create(duel);

  await eloHistory.items.create({
    id: `eh-${Date.now()}-w`,
    playerId: winner.id,
    duelId: duel.id,
    elo: winner.elo,
    ts: new Date().toISOString()
  });

  await eloHistory.items.create({
    id: `eh-${Date.now()}-l`,
    playerId: loser.id,
    duelId: duel.id,
    elo: loser.elo,
    ts: new Date().toISOString()
  });

  context.res = { status: 200, body: duel };
};

