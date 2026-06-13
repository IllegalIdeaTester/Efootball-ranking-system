/**
 * db.js — JSON File Database
 * 
 * Stores all data in rankings.json next to server.js.
 * Uses Node.js built-in 'fs' module only — zero npm dependencies beyond express.
 * All operations are synchronous for simplicity and ACID-like safety.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculatePointsExchange } from './elo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, 'rankings.json');

// ================= FILE I/O =================

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { players: [], matches: [] };
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { players: [], matches: [] };
  }
}

function writeDb(data) {
  // Atomic write: write to temp file then rename
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ================= INIT =================

export function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    writeDb({ players: [], matches: [] });
    console.log('Created new rankings.json database at', DB_PATH);
  } else {
    console.log('Loaded existing rankings.json database from', DB_PATH);
  }
}

// ================= RECALCULATION ENGINE =================

export function recalculateAllMatches() {
  const data = readDb();

  // Sort matches chronologically
  data.matches.sort((a, b) => a.timestamp - b.timestamp);

  // Initialize in-memory state for each player
  const playersMap = {};
  data.players.forEach(p => {
    playersMap[p.id] = {
      ...p,
      points: p.startingPoints,
      peakPoints: p.startingPoints,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      goalDifference: 0,
      form: [],
      ratingHistory: [{ timestamp: 0, dateString: 'Start', points: p.startingPoints, rank: 1 }]
    };
  });

  // Process each match
  data.matches.forEach(match => {
    const p1 = playersMap[match.player1Id];
    const p2 = playersMap[match.player2Id];

    if (!p1 || !p2) {
      match.player1PointsBefore = 0;
      match.player2PointsBefore = 0;
      match.player1PointsAfter = 0;
      match.player2PointsAfter = 0;
      match.player1Delta = 0;
      match.player2Delta = 0;
      return;
    }

    match.player1PointsBefore = p1.points;
    match.player2PointsBefore = p2.points;

    const result = calculatePointsExchange(
      p1.points, p2.points,
      match.score1, match.score2,
      match.importance,
      match.isKnockout,
      match.isPSO,
      match.psoWinner
    );

    p1.points = Math.round((p1.points + result.deltaA) * 100) / 100;
    p2.points = Math.round((p2.points + result.deltaB) * 100) / 100;

    if (p1.points > p1.peakPoints) p1.peakPoints = p1.points;
    if (p2.points > p2.peakPoints) p2.peakPoints = p2.points;

    match.player1Delta = result.deltaA;
    match.player2Delta = result.deltaB;
    match.player1PointsAfter = p1.points;
    match.player2PointsAfter = p2.points;

    p1.matchesPlayed++;
    p2.matchesPlayed++;
    p1.goalsScored += match.score1;
    p1.goalsConceded += match.score2;
    p2.goalsScored += match.score2;
    p2.goalsConceded += match.score1;
    p1.goalDifference = p1.goalsScored - p1.goalsConceded;
    p2.goalDifference = p2.goalsScored - p2.goalsConceded;

    const isDraw = !match.isPSO && match.score1 === match.score2;
    const p1Won = !match.isPSO && match.score1 > match.score2;
    const p2Won = !match.isPSO && match.score2 > match.score1;

    if (isDraw) {
      p1.draws++; p2.draws++;
      p1.form.push('D'); p2.form.push('D');
    } else if (match.isPSO) {
      p1.draws++; p2.draws++;
      if (match.psoWinner === 'A') { p1.form.push('W'); p2.form.push('L'); }
      else { p1.form.push('L'); p2.form.push('W'); }
    } else if (p1Won) {
      p1.wins++; p2.losses++;
      p1.form.push('W'); p2.form.push('L');
    } else if (p2Won) {
      p2.wins++; p1.losses++;
      p2.form.push('W'); p1.form.push('L');
    }

    if (p1.form.length > 5) p1.form.shift();
    if (p2.form.length > 5) p2.form.shift();

    p1.ratingHistory.push({ timestamp: match.timestamp, dateString: match.dateString, points: p1.points, rank: 1 });
    p2.ratingHistory.push({ timestamp: match.timestamp, dateString: match.dateString, points: p2.points, rank: 1 });
  });

  // Sort by points > GD > GS and assign ranks
  const playersList = Object.values(playersMap);
  playersList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsScored - a.goalsScored;
  });
  playersList.forEach((p, i) => { p.rank = i + 1; });

  // Populate rank in rating history per timestamp
  const historyTimestamps = [0, ...data.matches.map(m => m.timestamp)];
  historyTimestamps.forEach(ts => {
    const pts = playersList.map(p => {
      const entry = p.ratingHistory.find(h => h.timestamp === ts) ||
                    p.ratingHistory.filter(h => h.timestamp < ts).pop() ||
                    { points: p.startingPoints };
      return { id: p.id, points: entry.points };
    });
    pts.sort((a, b) => b.points - a.points);
    playersList.forEach(p => {
      const entry = p.ratingHistory.find(h => h.timestamp === ts);
      if (entry) entry.rank = pts.findIndex(x => x.id === p.id) + 1;
    });
  });

  // Rank change vs previous entry
  playersList.forEach(p => {
    if (p.ratingHistory.length > 1) {
      p.rankChange = p.ratingHistory[p.ratingHistory.length - 2].rank - p.rank;
    } else {
      p.rankChange = 0;
    }
  });

  // Write updated data back to file
  data.players = playersList;
  writeDb(data);
  console.log('Recalculation complete. Data saved to rankings.json.');
}

// ================= CRUD =================

export function getPlayers() {
  const data = readDb();
  return [...data.players].sort((a, b) => a.rank - b.rank);
}

export function addPlayer(name, room, team, startingPoints = 1000) {
  const data = readDb();
  const id = generateId();
  const pts = parseFloat(startingPoints) || 1000;
  data.players.push({
    id, name: name.trim(), room: room.trim(), team: team.trim(),
    startingPoints: pts, points: pts, peakPoints: pts,
    matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
    goalsScored: 0, goalsConceded: 0, goalDifference: 0,
    form: [], ratingHistory: [], rank: data.players.length + 1, rankChange: 0
  });
  writeDb(data);
  recalculateAllMatches();
  return id;
}

export function deletePlayer(id) {
  const data = readDb();
  data.players = data.players.filter(p => p.id !== id);
  data.matches = data.matches.filter(m => m.player1Id !== id && m.player2Id !== id);
  writeDb(data);
  recalculateAllMatches();
}

export function getMatches() {
  const data = readDb();
  return [...data.matches].sort((a, b) => b.timestamp - a.timestamp);
}

export function addMatch(player1Id, player2Id, score1, score2, importance, isKnockout = false, isPSO = false, psoWinner = null) {
  const data = readDb();
  const p1 = data.players.find(p => p.id === player1Id);
  const p2 = data.players.find(p => p.id === player2Id);
  if (!p1 || !p2) throw new Error('One or both players not found');

  const id = generateId();
  const date = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateString = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  data.matches.push({
    id, player1Id, player2Id, player1Name: p1.name, player2Name: p2.name,
    score1: parseInt(score1), score2: parseInt(score2),
    importance: parseInt(importance),
    isKnockout: !!isKnockout, isPSO: !!isPSO, psoWinner: psoWinner || null,
    timestamp: date.getTime(), dateString,
    player1PointsBefore: 0, player2PointsBefore: 0,
    player1PointsAfter: 0, player2PointsAfter: 0,
    player1Delta: 0, player2Delta: 0
  });
  writeDb(data);
  recalculateAllMatches();
  return id;
}

export function deleteMatch(id) {
  const data = readDb();
  data.matches = data.matches.filter(m => m.id !== id);
  writeDb(data);
  recalculateAllMatches();
}

export function resetDatabase() {
  writeDb({ players: [], matches: [] });
  console.log('Database wiped.');
}

export function importData(players, matches) {
  writeDb({ players, matches });
  recalculateAllMatches();
  console.log('Import and recalculation completed.');
}
