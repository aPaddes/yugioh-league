const { players, duels } = require("../shared/cosmos");
const { getCurrentUserRecord } = require("../shared/auth");

module.exports = async function (context) {
  const { user } = await getCurrentUserRecord(context.req, players);
  if (!user?.isAdmin) {
    context.res = { status: 403, body: "Admins only" };
    return;
  }

  const { seasonId } = context.bindingData;

  const { resources: duelList } = await duels.items.query({
    query: "SELECT c.id, c.season FROM c WHERE c.season = @season",
    parameters: [{ name: "@season", value: seasonId }]
  }).fetchAll();

  for (const d of duelList) {
    await duels.item(d.id, d.season).delete();
  }

  const { resources: playersList } = await players.items.readAll().fetchAll();
  for (const p of playersList) {
    p.elo = 1200;
    p.wins = 0;
    p.losses = 0;
    await players.item(p.id, p.id).replace(p);
  }

  context.res = { status: 200, body: { reset: true, season: seasonId } };
};
``
