const { duels } = require("../shared/cosmos");

module.exports = async function (context, req) {
  const season = req.query.season || "2026-S1";

  const querySpec = {
    query: "SELECT * FROM c WHERE c.season = @season ORDER BY c.date DESC",
    parameters: [{ name: "@season", value: season }]
  };

  const { resources } = await duels.items.query(querySpec).fetchAll();
  context.res = { status: 200, body: resources };
};
