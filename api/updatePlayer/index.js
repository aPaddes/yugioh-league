const { players } = require("../shared/cosmos");
const { getCurrentUserRecord } = require("../shared/auth");

module.exports = async function (context, req) {
  const { user } = await getCurrentUserRecord(req, players);
  if (!user?.isAdmin) {
    context.res = { status: 403, body: "Admins only" };
    return;
  }

  const { playerId } = context.bindingData;
  const patch = req.body || {};

  const { resource } = await players.item(playerId, playerId).read();
  if (!resource) {
    context.res = { status: 404, body: "Player not found" };
    return;
  }

  if (typeof patch.group === "string") resource.group = patch.group;
  if (typeof patch.elo === "number") resource.elo = patch.elo;
  if (typeof patch.isAdmin === "boolean") resource.isAdmin = patch.isAdmin;

  await players.item(playerId, playerId).replace(resource);
  context.res = { status: 200, body: resource };
};
