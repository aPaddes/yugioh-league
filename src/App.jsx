import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, getAuthInfo } from "./api";

const GROUPS = ["Slifer", "Ra", "Obelisk"];
const SEASONS = [
  { id: "2026-S1", label: "Season 1 · 2026", status: "active", format: "Goat" },
  { id: "2025-S2", label: "Season 2 · 2025", status: "completed", format: "Edison" }
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);
  const [duels, setDuels] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [season, setSeason] = useState("2026-S1");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [logForm, setLogForm] = useState({
    p1Id: "",
    p2Id: "",
    winnerId: "",
    format: "Goat",
    notes: ""
  });

  const [wizard, setWizard] = useState({
    name: "Academy Cup",
    season: "2026-S1",
    type: "single-elimination",
    playerIds: [],
    randomize: false
  });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await getAuthInfo();
      const meData = await apiGet("/api/me");
      const playersData = await apiGet("/api/players");
      const duelsData = await apiGet(`/api/duels?season=${encodeURIComponent(season)}`);
      const tournamentsData = await apiGet(`/api/tournaments?season=${encodeURIComponent(season)}`);

      setMe(meData);
      setPlayers(playersData);
      setDuels(duelsData);
      setTournaments(tournamentsData);
      setWizard((w) => ({
        ...w,
        playerIds: w.playerIds.length ? w.playerIds : playersData.map((p) => p.id)
      }));
      setAuthReady(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [season]);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => b.elo - a.elo),
    [players]
  );

  const currentTournament = tournaments[0] || null;

  const groupStanding = useMemo(() => {
    const totals = { Slifer: 0, Ra: 0, Obelisk: 0 };
    const counts = { Slifer: 0, Ra: 0, Obelisk: 0 };

    players.forEach((p) => {
      totals[p.group] += p.elo || 0;
      counts[p.group] += 1;
    });

    return GROUPS.map((g) => ({
      group: g,
      avgElo: counts[g] ? Math.round(totals[g] / counts[g]) : 0,
      members: counts[g]
    })).sort((a, b) => b.avgElo - a.avgElo);
  }, [players]);

  async function submitDuel(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiPost("/api/duels", { ...logForm, season });
      setMessage("Duel saved and ELO updated.");
      setLogForm({
        p1Id: "",
        p2Id: "",
        winnerId: "",
        format: "Goat",
        notes: ""
      });
      await loadAll();
      setTab("leaderboard");
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function changePlayer(playerId, patch) {
    try {
      await apiPatch(`/api/players/${playerId}`, patch);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeDuel(duelId) {
    try {
      await apiDelete(`/api/duels/${duelId}?season=${encodeURIComponent(season)}`);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetSeason() {
    if (!window.confirm(`Reset all ELO and all duels for ${season}?`)) return;
    try {
      await apiPost(`/api/seasons/${encodeURIComponent(season)}/reset`, {});
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createTournament() {
    try {
      let selectedPlayers = players.filter((p) => wizard.playerIds.includes(p.id));
      if (wizard.randomize) {
        selectedPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
      }

      const body = {
        name: wizard.name,
        season: wizard.season,
        type: wizard.type,
        playerIds: selectedPlayers.map((p) => p.id)
      };

      await apiPost("/api/tournaments", body);
      setMessage("Tournament created.");
      setTab("tournament");
      setSeason(wizard.season);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function chooseWinner(matchId, winnerId) {
    try {
      await apiPatch(`/api/tournaments/${currentTournament.id}/matches/${matchId}`, {
        winnerId
      });
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  function login() {
    window.location.href = "/login";
  }

  function logout() {
    window.location.href = "/logout";
  }

  if (loading) {
    return <div className="page"><div className="card"><h2>Loading...</h2></div></div>;
  }

  if (!authReady || !me) {
    return (
      <div className="page">
        <div className="card">
          <h1>Yu-Gi-Oh League</h1>
          <p>Sign in with your Microsoft account from your tenant.</p>
          <button onClick={login}>Sign in</button>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Yu-Gi-Oh League</h1>
          <p className="muted">Progression series · groups · ELO · tournaments</p>
        </div>
        <div className="topbar-actions">
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            {SEASONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className={`pill group-${(me.group || "").toLowerCase()}`}>{me.group}</span>
          <span className="pill">{me.displayName || me.email}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="tabs">
        {["dashboard", "log", "leaderboard", "groups", "tournament", "profile"]
          .concat(me.isAdmin ? ["admin"] : [])
          .map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {tab === "dashboard" && (
        <div className="grid grid-3">
          <div className="card">
            <h3>Your ELO</h3>
            <div className="big">{me.elo}</div>
          </div>
          <div className="card">
            <h3>Record</h3>
            <div className="big">{me.wins}W - {me.losses}L</div>
          </div>
          <div className="card">
            <h3>Top group</h3>
            <div className="big">{groupStanding[0]?.group || "-"}</div>
            <p className="muted">Avg ELO {groupStanding[0]?.avgElo || 0}</p>
          </div>

          <div className="card full">
            <h3>Recent duels</h3>
            {duels.length === 0 ? <p>No duels yet.</p> : (
              <div className="list">
                {duels.slice(0, 10).map((d) => (
                  <div className="list-item" key={d.id}>
                    <div>
                      <strong>{playerMap[d.p1]?.displayName || d.p1}</strong> vs{" "}
                      <strong>{playerMap[d.p2]?.displayName || d.p2}</strong>
                    </div>
                    <div className="muted">
                      Winner: {playerMap[d.winner]?.displayName || d.winner} · {d.format} · {d.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="card">
          <h3>Log duel</h3>
          <form className="form" onSubmit={submitDuel}>
            <label>Player 1</label>
            <select
              value={logForm.p1Id}
              onChange={(e) => setLogForm({ ...logForm, p1Id: e.target.value })}
              required
            >
              <option value="">Select</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>

            <label>Player 2</label>
            <select
              value={logForm.p2Id}
              onChange={(e) => setLogForm({ ...logForm, p2Id: e.target.value })}
              required
            >
              <option value="">Select</option>
              {players.filter((p) => p.id !== logForm.p1Id).map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>

            <label>Winner</label>
            <select
              value={logForm.winnerId}
              onChange={(e) => setLogForm({ ...logForm, winnerId: e.target.value })}
              required
            >
              <option value="">Select</option>
              {logForm.p1Id ? <option value={logForm.p1Id}>{playerMap[logForm.p1Id]?.displayName}</option> : null}
              {logForm.p2Id ? <option value={logForm.p2Id}>{playerMap[logForm.p2Id]?.displayName}</option> : null}
            </select>

            <label>Format</label>
            <select
              value={logForm.format}
              onChange={(e) => setLogForm({ ...logForm, format: e.target.value })}
            >
              <option value="Goat">Goat</option>
              <option value="Edison">Edison</option>
              <option value="HAT">HAT</option>
              <option value="TeleDAD">TeleDAD</option>
              <option value="Modern">Modern</option>
            </select>

            <label>Notes</label>
            <textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            />

            <button type="submit">Save duel</button>
          </form>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="card">
          <h3>Leaderboard</h3>
          <div className="list">
            {rankedPlayers.map((p, idx) => (
              <div className="list-item" key={p.id}>
                <div>
                  <strong>#{idx + 1} {p.displayName}</strong> <span className={`pill group-${p.group.toLowerCase()}`}>{p.group}</span>
                </div>
                <div>{p.elo} ELO · {p.wins}W - {p.losses}L</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "groups" && (
        <div className="grid grid-3">
          {groupStanding.map((g) => (
            <div className="card" key={g.group}>
              <h3>{g.group}</h3>
              <div className="big">{g.avgElo}</div>
              <p className="muted">{g.members} members</p>
              <div className="list">
                {players.filter((p) => p.group === g.group)
                  .sort((a, b) => b.elo - a.elo)
                  .map((p) => (
                    <div className="list-item" key={p.id}>
                      <div>{p.displayName}</div>
                      <div>{p.elo}</div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tournament" && (
        <div className="card">
          <h3>Tournament</h3>
          {!currentTournament ? (
            <p>No tournament for this season yet.</p>
          ) : (
            <>
              <p>
                <strong>{currentTournament.name}</strong> · {currentTournament.type} · {currentTournament.status}
              </p>

              {currentTournament.type === "single-elimination" && currentTournament.rounds ? (
                <div className="bracket">
                  {currentTournament.rounds.map((round) => (
                    <div className="round" key={round.name}>
                      <h4>{round.name}</h4>
                      {round.matches.map((m) => (
                        <div key={m.id} className="match">
                          <button
                            className={m.winner === m.p1 ? "winner" : ""}
                            disabled={!me.isAdmin || !m.p1 || !m.p2}
                            onClick={() => chooseWinner(m.id, m.p1)}
                          >
                            {m.p1 ? (playerMap[m.p1]?.displayName || m.p1) : "TBD"}
                          </button>
                          <button
                            className={m.winner === m.p2 ? "winner" : ""}
                            disabled={!me.isAdmin || !m.p1 || !m.p2}
                            onClick={() => chooseWinner(m.id, m.p2)}
                          >
                            {m.p2 ? (playerMap[m.p2]?.displayName || m.p2) : "TBD"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card subtle">
                  <p>This tournament type is already stored and visible.</p>
                  <p className="muted">
                    For double-elimination and Swiss, the metadata is saved now. Full progression logic can be expanded later.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "profile" && (
        <div className="card">
          <h3>Profile</h3>
          <p><strong>Name:</strong> {me.displayName}</p>
          <p><strong>Email:</strong> {me.email}</p>
          <p><strong>Group:</strong> {me.group}</p>
          <p><strong>ELO:</strong> {me.elo}</p>
          <p><strong>Record:</strong> {me.wins}W - {me.losses}L</p>
          <p><strong>Admin:</strong> {me.isAdmin ? "Yes" : "No"}</p>
        </div>
      )}

      {tab === "admin" && me.isAdmin && (
        <div className="grid grid-2">
          <div className="card">
            <h3>Create tournament</h3>
            <div className="form">
              <label>Name</label>
              <input
                value={wizard.name}
                onChange={(e) => setWizard({ ...wizard, name: e.target.value })}
              />

              <label>Season</label>
              <select
                value={wizard.season}
                onChange={(e) => setWizard({ ...wizard, season: e.target.value })}
              >
                {SEASONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <label>Type</label>
              <select
                value={wizard.type}
                onChange={(e) => setWizard({ ...wizard, type: e.target.value })}
              >
                <option value="single-elimination">Single elimination</option>
                <option value="double-elimination">Double elimination</option>
                <option value="swiss">Swiss</option>
              </select>

              <label>Players</label>
              <div className="checkbox-list">
                {rankedPlayers.map((p) => (
                  <label key={p.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={wizard.playerIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWizard({ ...wizard, playerIds: [...wizard.playerIds, p.id] });
                        } else {
                          setWizard({
                            ...wizard,
                            playerIds: wizard.playerIds.filter((x) => x !== p.id)
                          });
                        }
                      }}
                    />
                    {p.displayName} ({p.elo})
                  </label>
                ))}
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={wizard.randomize}
                  onChange={(e) => setWizard({ ...wizard, randomize: e.target.checked })}
                />
                Randomize selected players
              </label>

              <button onClick={createTournament}>Create tournament</button>
            </div>
          </div>

          <div className="card">
            <h3>Player management</h3>
            <div className="list">
              {players.map((p) => (
                <div className="list-item vertical" key={p.id}>
                  <div><strong>{p.displayName}</strong> ({p.email})</div>
                  <div className="admin-row">
                    <select
                      value={p.group}
                      onChange={(e) => changePlayer(p.id, { group: e.target.value })}
                    >
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={p.elo}
                      onChange={(e) => changePlayer(p.id, { elo: Number(e.target.value) || 0 })}
                    />

                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!p.isAdmin}
                        onChange={(e) => changePlayer(p.id, { isAdmin: e.target.checked })}
                      />
                      Admin
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Delete duel</h3>
            <div className="list">
              {duels.map((d) => (
                <div className="list-item" key={d.id}>
                  <div>
                    {playerMap[d.p1]?.displayName} vs {playerMap[d.p2]?.displayName} · winner {playerMap[d.winner]?.displayName}
                  </div>
                  <button className="danger small" onClick={() => removeDuel(d.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Reset active season</h3>
            <p>This deletes all duels in the selected season and resets all players back to ELO 1200, 0W / 0L.</p>
            <button className="danger" onClick={resetSeason}>Reset season</button>
          </div>
        </div>
      )}
    </div>
  );
}
