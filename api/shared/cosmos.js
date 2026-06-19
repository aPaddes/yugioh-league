const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const db = client.database("yugiohleague");

module.exports = {
  db,
  players: db.container("players"),
  duels: db.container("duels"),
  tournaments: db.container("tournaments"),
  eloHistory: db.container("eloHistory")
};
