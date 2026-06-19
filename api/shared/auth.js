function parseClientPrincipal(req) {
  try {
    const header = req.headers["x-ms-client-principal"];
    if (!header) return null;
    const decoded = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

async function getCurrentUserRecord(req, playersContainer) {
  const principal = parseClientPrincipal(req);
  if (!principal?.userId) return { principal: null, user: null };

  try {
    const { resource } = await playersContainer.item(principal.userId, principal.userId).read();
    return { principal, user: resource };
  } catch {
    return { principal, user: null };
  }
}

module.exports = {
  parseClientPrincipal,
  getCurrentUserRecord
};
