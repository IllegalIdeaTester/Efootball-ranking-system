// Implemented globally by elo.js

// ================= SHARED STATE (Supabase-backed via /api/state) =================
//
// All ranking/Elo computation below still happens entirely in the browser,
// exactly as before. The ONLY thing that changed is where the raw
// { players, matches } data lives: instead of localStorage (per-browser),
// it now lives on the server (Supabase), shared by everyone.
//
// _cache holds the current in-memory copy. loadPlayers()/loadMatches() read
// from it synchronously (so all existing rendering code keeps working
// unchanged). saveState() updates the cache immediately AND pushes the new
// state to the server in the background.

let _cache = { players: [], matches: [] };
let _stateReady = false;
let _saveQueued = false;
let _savePending = null;

/**
 * Fetches the current shared state from the server into _cache.
 * Must be awaited once on startup before any rendering happens.
 */
async function initState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('Failed to load state: ' + res.status);
    const data = await res.json();
    _cache = {
      players: Array.isArray(data.players) ? data.players : [],
      matches: Array.isArray(data.matches) ? data.matches : []
    };
  } catch (e) {
    console.error('Could not load shared state from server, starting empty:', e);
    _cache = { players: [], matches: [] };
  }
  _stateReady = true;
}

/**
 * Pushes the current _cache to the server. Fire-and-forget with basic
 * coalescing so rapid successive saves don't pile up requests.
 */
function persistState() {
  const payload = JSON.stringify({ players: _cache.players, matches: _cache.matches });

  if (_saveQueued) {
    _savePending = payload;
    return;
  }

  _saveQueued = true;
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  })
  .catch(e => console.error('Failed to save shared state to server:', e))
  .finally(() => {
    _saveQueued = false;
    if (_savePending) {
      const next = _savePending;
      _savePending = null;
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: next
      }).catch(e => console.error('Failed to save shared state to server:', e));
    }
  });
}

/**
 * Helper to generate unique IDs.
 */
function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Loads players from the shared in-memory cache (deep copy, like before).
 */
function loadPlayers() {
  return JSON.parse(JSON.stringify(_cache.players || []));
}

/**
 * Loads matches from the shared in-memory cache (deep copy, like before).
 */
function loadMatches() {
  return JSON.parse(JSON.stringify(_cache.matches || []));
}

/**
 * Saves current players and matches to the shared cache + server.
 */
function saveState(players, matches) {
  _cache = { players, matches };
  persistState();
}

function seedDatabaseIfEmpty() {
  const players = loadPlayers();
  const matches = loadMatches();

  if (players.length === 0 && matches.length === 0) {
    seedDefaultData();
    return true;
  }

  if (players.length === 0) {
    seedDefaultData();
    return true;
  }

  if (matches.length === 0) {
    recalculateAllMatches();
    return true;
  }

  return false;
}

function seedDefaultData() {
  const defaultPlayers = [
    { id: generateId(), name: "Tunde 'The Wall' Cole", room: 'Room 105', team: 'Paris Saint-Germain', startingPoints: 1150 },
    { id: generateId(), name: "Chinedu 'Sniper' Obi", room: 'Room 203', team: 'Real Madrid', startingPoints: 1080 },
    { id: generateId(), name: "Emeka 'Joga Bonito' Kalu", room: 'Room 304', team: 'Manchester City', startingPoints: 1020 },
    { id: generateId(), name: "Kelechi 'Goal Machine' Eze", room: 'Room 112', team: 'FC Barcelona', startingPoints: 1000 },
    { id: generateId(), name: "Abiola 'Tactician' Alao", room: 'Room 215', team: 'Bayern Munich', startingPoints: 950 },
    { id: generateId(), name: "Femi 'Super Sub' Johnson", room: 'Room 108', team: 'Arsenal FC', startingPoints: 900 }
  ];

  const playersByName = defaultPlayers.reduce((map, player) => {
    map[player.name] = player;
    return map;
  }, {});

  const defaultMatches = [
    { player1Name: defaultPlayers[0].name, player2Name: defaultPlayers[1].name, score1: 3, score2: 1, importance: 5, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[2].name, player2Name: defaultPlayers[3].name, score1: 2, score2: 2, importance: 15, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[3].name, player2Name: defaultPlayers[4].name, score1: 4, score2: 0, importance: 5, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[0].name, player2Name: defaultPlayers[2].name, score1: 2, score2: 3, importance: 10, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[1].name, player2Name: defaultPlayers[5].name, score1: 2, score2: 1, importance: 15, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[4].name, player2Name: defaultPlayers[5].name, score1: 1, score2: 1, importance: 15, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[0].name, player2Name: defaultPlayers[1].name, score1: 1, score2: 1, importance: 35, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[2].name, player2Name: defaultPlayers[3].name, score1: 1, score2: 2, importance: 35, isKnockout: false, isPSO: false, psoWinner: null },
    { player1Name: defaultPlayers[1].name, player2Name: defaultPlayers[3].name, score1: 2, score2: 2, importance: 50, isKnockout: true, isPSO: true, psoWinner: 'B' },
    { player1Name: defaultPlayers[0].name, player2Name: defaultPlayers[3].name, score1: 3, score2: 2, importance: 60, isKnockout: true, isPSO: false, psoWinner: null }
  ];

  const matches = defaultMatches.map(match => {
    const player1 = playersByName[match.player1Name];
    const player2 = playersByName[match.player2Name];
    return {
      id: generateId(),
      player1Id: player1.id,
      player2Id: player2.id,
      player1Name: player1.name,
      player2Name: player2.name,
      score1: match.score1,
      score2: match.score2,
      importance: match.importance,
      isKnockout: match.isKnockout,
      isPSO: match.isPSO,
      psoWinner: match.psoWinner,
      timestamp: Date.now() + Math.floor(Math.random() * 1000),
      dateString: new Date().toISOString().slice(0,16).replace('T', ' '),
      player1PointsBefore: 0,
      player2PointsBefore: 0,
      player1PointsAfter: 0,
      player2PointsAfter: 0,
      player1Delta: 0,
      player2Delta: 0
    };
  });

  _cache.players = defaultPlayers;
  _cache.matches = matches;
  recalculateAllMatches();
}

/**
 * Recalculates all player statistics and rankings based on the chronological match history.
 * This is the core engine that ensures data integrity.
 */
function recalculateAllMatches() {
  let players = loadPlayers();
  let matches = loadMatches();

  // 1. Sort matches chronologically to ensure calculation is applied in order
  matches.sort((a, b) => a.timestamp - b.timestamp);

  // 2. Reset all players to initial state
  players = players.map(p => ({
    ...p,
    points: p.startingPoints || 1000,
    peakPoints: p.startingPoints || 1000,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    goalDifference: 0,
    form: [],
    ratingHistory: [{
      timestamp: 0,
      dateString: 'Start',
      points: p.startingPoints || 1000,
      rank: 1
    }]
  }));

  // Create a map for quick player access during simulation
  const playerMap = {};
  players.forEach(p => {
    playerMap[p.id] = p;
  });

  // 3. Process matches in order and apply Elo calculations
  matches.forEach(match => {
    const p1 = playerMap[match.player1Id];
    const p2 = playerMap[match.player2Id];

    if (!p1 || !p2) {
      // If a player was deleted, we ignore this match in points calculations
      match.player1PointsBefore = 0;
      match.player2PointsBefore = 0;
      match.player1PointsAfter = 0;
      match.player2PointsAfter = 0;
      match.player1Delta = 0;
      match.player2Delta = 0;
      return;
    }

    // Capture ratings before this match
    match.player1PointsBefore = p1.points;
    match.player2PointsBefore = p2.points;

    // Calculate rating change
    const result = calculatePointsExchange(
      p1.points,
      p2.points,
      match.score1,
      match.score2,
      match.importance,
      match.isKnockout,
      match.isPSO,
      match.psoWinner
    );

    // Apply changes
    p1.points = Math.round((p1.points + result.deltaA) * 100) / 100;
    p2.points = Math.round((p2.points + result.deltaB) * 100) / 100;

    // Update peak ratings
    if (p1.points > p1.peakPoints) p1.peakPoints = p1.points;
    if (p2.points > p2.peakPoints) p2.peakPoints = p2.points;

    // Save calculation outcome inside match log for historical display
    match.player1Delta = result.deltaA;
    match.player2Delta = result.deltaB;
    match.player1PointsAfter = p1.points;
    match.player2PointsAfter = p2.points;

    // Update matches played
    p1.matchesPlayed++;
    p2.matchesPlayed++;

    // Update goal statistics
    p1.goalsScored += match.score1;
    p1.goalsConceded += match.score2;
    p2.goalsScored += match.score2;
    p2.goalsConceded += match.score1;

    p1.goalDifference = p1.goalsScored - p1.goalsConceded;
    p2.goalDifference = p2.goalsScored - p2.goalsConceded;

    // Update W/D/L records and form
    // Note: For penalty shootouts, the match is technically a draw in statistics
    const isDraw = !match.isPSO && match.score1 === match.score2;
    const p1WonRegular = !match.isPSO && match.score1 > match.score2;
    const p2WonRegular = !match.isPSO && match.score2 > match.score1;

    if (isDraw) {
      p1.draws++;
      p2.draws++;
      p1.form.push('D');
      p2.form.push('D');
    } else if (match.isPSO) {
      // It's a penalty shootout
      p1.draws++; // Treated as draw in overall stats
      p2.draws++;
      if (match.psoWinner === 'A') {
        p1.form.push('W'); // Still counted as a win in form
        p2.form.push('L');
      } else {
        p1.form.push('L');
        p2.form.push('W');
      }
    } else if (p1WonRegular) {
      p1.wins++;
      p2.losses++;
      p1.form.push('W');
      p2.form.push('L');
    } else if (p2WonRegular) {
      p2.wins++;
      p1.losses++;
      p2.form.push('W');
      p1.form.push('L');
    }

    // Keep form to last 5 matches
    if (p1.form.length > 5) p1.form.shift();
    if (p2.form.length > 5) p2.form.shift();

    // Record temporary history point (rank will be filled in the next step)
    p1.ratingHistory.push({
      timestamp: match.timestamp,
      dateString: match.dateString,
      points: p1.points,
      rank: 1
    });

    p2.ratingHistory.push({
      timestamp: match.timestamp,
      dateString: match.dateString,
      points: p2.points,
      rank: 1
    });
  });

  // 4. Calculate rankings history and rank changes
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsScored - a.goalsScored;
  });

  players.forEach((player, index) => {
    player.rank = index + 1;
  });

  const activePlayers = [...players];
  const historyTimestamps = [0, ...matches.map(m => m.timestamp)];

  historyTimestamps.forEach(timestamp => {
    const pointsAtTime = activePlayers.map(p => {
      const histEntry = p.ratingHistory.find(h => h.timestamp === timestamp) ||
                        p.ratingHistory.filter(h => h.timestamp < timestamp).pop() ||
                        { points: p.startingPoints, rank: 1 };
      return { id: p.id, points: histEntry.points };
    });

    pointsAtTime.sort((a, b) => b.points - a.points);

    activePlayers.forEach(p => {
      const histEntry = p.ratingHistory.find(h => h.timestamp === timestamp);
      if (histEntry) {
        histEntry.rank = pointsAtTime.findIndex(item => item.id === p.id) + 1;
      }
    });
  });

  players.forEach(player => {
    if (player.ratingHistory.length > 1) {
      const currentRank = player.rank;
      const previousRank = player.ratingHistory[player.ratingHistory.length - 2].rank;
      player.rankChange = previousRank - currentRank;
    } else {
      player.rankChange = 0;
    }
  });

  saveState(players, matches);
  return { players, matches };
}

/**
 * Gets all players, sorted by rank.
 */
function getPlayers() {
  const players = loadPlayers();
  return players.sort((a, b) => a.rank - b.rank);
}

/**
 * Adds a new player.
 */
function addPlayer(name, room, team, startingPoints = 1000) {
  const players = loadPlayers();
  const newPlayer = {
    id: generateId(),
    name: name.trim(),
    room: room.trim(),
    team: team.trim(),
    startingPoints: parseFloat(startingPoints) || 1000,
    points: parseFloat(startingPoints) || 1000,
    peakPoints: parseFloat(startingPoints) || 1000,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    goalDifference: 0,
    form: [],
    ratingHistory: []
  };

  players.push(newPlayer);
  _cache.players = players;
  return recalculateAllMatches();
}

/**
 * Deletes a player and all matches they participated in.
 */
function deletePlayer(id) {
  let players = loadPlayers();
  let matches = loadMatches();

  players = players.filter(p => p.id !== id);
  matches = matches.filter(m => m.player1Id !== id && m.player2Id !== id);

  _cache.players = players;
  _cache.matches = matches;

  return recalculateAllMatches();
}

/**
 * Gets all matches.
 */
function getMatches() {
  const matches = loadMatches();
  return matches.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Logs a new match.
 */
function addMatch(player1Id, player2Id, score1, score2, importance, isKnockout = false, isPSO = false, psoWinner = null) {
  const matches = loadMatches();
  const players = loadPlayers();

  const p1 = players.find(p => p.id === player1Id);
  const p2 = players.find(p => p.id === player2Id);

  if (!p1 || !p2) {
    throw new Error('One or both players not found');
  }

  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const newMatch = {
    id: generateId(),
    player1Id,
    player2Id,
    player1Name: p1.name,
    player2Name: p2.name,
    score1: parseInt(score1),
    score2: parseInt(score2),
    importance: parseInt(importance),
    isKnockout,
    isPSO,
    psoWinner,
    timestamp: date.getTime(),
    dateString,
    player1PointsBefore: p1.points,
    player2PointsBefore: p2.points,
    player1PointsAfter: p1.points,
    player2PointsAfter: p2.points,
    player1Delta: 0,
    player2Delta: 0
  };

  matches.push(newMatch);
  _cache.matches = matches;

  return recalculateAllMatches();
}

/**
 * Deletes/reverts a logged match.
 */
function deleteMatch(id) {
  let matches = loadMatches();
  matches = matches.filter(m => m.id !== id);
  _cache.matches = matches;
  return recalculateAllMatches();
}

/**
 * Exports database to a JSON file.
 */
function exportData() {
  const data = {
    players: loadPlayers(),
    matches: loadMatches()
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Imports database from a JSON string.
 */
function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.players || !data.matches) {
      throw new Error("Invalid import format. Missing 'players' or 'matches' keys.");
    }
    _cache.players = data.players;
    _cache.matches = data.matches;
    recalculateAllMatches();
    return true;
  } catch (e) {
    console.error('Import error:', e);
    throw e;
  }
}

/**
 * Resets the entire database.
 */
function resetDatabase() {
  _cache = { players: [], matches: [] };
  persistState();
  return { players: [], matches: [] };
}
