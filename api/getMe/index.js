const { players } = require("../shared/cosmos");
const { parseClientPrincipal } = require("../shared/auth");

module.exports = async function (context, req) {
  const principal = parseClientPrincipal(req);

  if (!principal?.userId) {
    context.res = { status: 401, body: "Not authenticated" };
    return;
  }

  try {
    const { resource } = await players.item(principal.userId, principal.userId).read();
    context.res = { status: 200, body: resource };
    return;
  } catch {}

  const user = {
    id: principal.userId,
    displayName: principal.userDetails || principal.userId,
    email: principal.userDetails || principal.userId,
    group: "Slifer",
    elo: 1200,
    wins: 0,
    losses: 0,
    isAdmin: false,
    joinedAt: new Date().toISOString()
  };

  await players.items.create(user);
  context.res = { status: 200, body: user };
};
