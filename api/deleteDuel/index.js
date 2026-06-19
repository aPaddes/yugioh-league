const { duels, players } = require("../shared/cosmos");
const { getCurrentUserRecord } = require("../shared/auth");

module.exports = async function (context, req) {
  const { user } = await getCurrentUserRecord(req, players);
  if (!user?.isAdmin) {
    context.res = { status: 403, body: "Admins only" };
    return;
  }

  const { duelId } = context.bindingData;
  const season = req.query.season;

  if (!season) {
    context.res = { status: 400, body: "Season query parameter is required" };
    return;
  }

  await duels.item(duelId, season).delete();
  context.res = { status: 200, body: { deleted: true } };
};
