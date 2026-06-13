// Implemented globally by elo.js

// LocalStorage keys
const PLAYERS_KEY = 'efootball_rankings_players';
const MATCHES_KEY = 'efootball_rankings_matches';

/**
 * Helper to generate unique IDs.
 */
function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Loads players from localStorage.
 */
function loadPlayers() {
  const data = localStorage.getItem(PLAYERS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Loads matches from localStorage.
 */
function loadMatches() {
  const data = localStorage.getItem(MATCHES_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Saves current players and matches to localStorage.
 */
function saveState(players, matches) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
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
      rank: 1 // placeholder
    });

    p2.ratingHistory.push({
      timestamp: match.timestamp,
      dateString: match.dateString,
      points: p2.points,
      rank: 1 // placeholder
    });
  });

  // 4. Calculate rankings history and rank changes
  // We can sort the players at each step of history to populate historical ranks.
  // For the final ranks, we sort now.
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsScored - a.goalsScored; // Tie-breakers
  });

  // Apply ranks
  players.forEach((player, index) => {
    player.rank = index + 1;
  });

  // Re-run historical rankings to fill correct ranks in ratingHistory
  // For this, we'll scan matches chronologically and rank players at each timestamp
  const activePlayers = [...players];
  const historyTimestamps = [0, ...matches.map(m => m.timestamp)];

  historyTimestamps.forEach(timestamp => {
    // Determine player points at this specific timestamp
    const pointsAtTime = activePlayers.map(p => {
      const histEntry = p.ratingHistory.find(h => h.timestamp === timestamp) ||
                        p.ratingHistory.filter(h => h.timestamp < timestamp).pop() ||
                        { points: p.startingPoints, rank: 1 };
      return { id: p.id, points: histEntry.points };
    });

    // Sort by points at this time
    pointsAtTime.sort((a, b) => b.points - a.points);

    // Write rank back to the specific history entry
    activePlayers.forEach(p => {
      const histEntry = p.ratingHistory.find(h => h.timestamp === timestamp);
      if (histEntry) {
        histEntry.rank = pointsAtTime.findIndex(item => item.id === p.id) + 1;
      }
    });
  });

  // Calculate rank changes (current rank vs rank before the last match)
  players.forEach(player => {
    if (player.ratingHistory.length > 1) {
      const currentRank = player.rank;
      const previousRank = player.ratingHistory[player.ratingHistory.length - 2].rank;
      player.rankChange = previousRank - currentRank; // positive is moving up
    } else {
      player.rankChange = 0;
    }
  });

  // Save the updated states back to localStorage
  saveState(players, matches);
  return { players, matches };
}

/**
 * Gets all players, sorted by rank.
 */
function getPlayers() {
  const players = loadPlayers();
  // Ensure they are sorted by rank
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
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  
  // Recalculate to establish rankings
  return recalculateAllMatches();
}

/**
 * Deletes a player and all matches they participated in.
 */
function deletePlayer(id) {
  let players = loadPlayers();
  let matches = loadMatches();

  players = players.filter(p => p.id !== id);
  // Remove matches involving this player to keep calculations consistent
  matches = matches.filter(m => m.player1Id !== id && m.player2Id !== id);

  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));

  return recalculateAllMatches();
}

/**
 * Gets all matches.
 */
function getMatches() {
  const matches = loadMatches();
  // Return descending chronologically (newest first) for display
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
    player1PointsAfter: p1.points, // filled during recalculate
    player2PointsAfter: p2.points, // filled during recalculate
    player1Delta: 0,
    player2Delta: 0
  };

  matches.push(newMatch);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));

  return recalculateAllMatches();
}

/**
 * Deletes/reverts a logged match.
 */
function deleteMatch(id) {
  let matches = loadMatches();
  matches = matches.filter(m => m.id !== id);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
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
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(data.players));
    localStorage.setItem(MATCHES_KEY, JSON.stringify(data.matches));
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
  localStorage.removeItem(PLAYERS_KEY);
  localStorage.removeItem(MATCHES_KEY);
  return { players: [], matches: [] };
}
