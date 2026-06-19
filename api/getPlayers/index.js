const { players } = require("../shared/cosmos");

module.exports = async function (context) {
  const { resources } = await players.items.readAll().fetchAll();
  resources.sort((a, b) => b.elo - a.elo);
  context.res = { status: 200, body: resources };
};
