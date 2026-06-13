import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  getPlayers,
  addPlayer,
  deletePlayer,
  getMatches,
  addMatch,
  deleteMatch,
  resetDatabase,
  importData
} from './db.js';
import { seedDatabase } from './seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ================= REST API ENDPOINTS =================

// 1. Players Endpoints
app.get('/api/players', (req, res) => {
  try {
    res.json(getPlayers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', (req, res) => {
  try {
    const { name, room, team, startingPoints } = req.body;
    if (!name || !room || !team) {
      return res.status(400).json({ error: 'Missing name, room, or team' });
    }
    const id = addPlayer(name, room, team, startingPoints);
    res.status(201).json({ id, message: 'Player registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/players/:id', (req, res) => {
  try {
    deletePlayer(req.params.id);
    res.json({ message: 'Player and associated matches deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Matches Endpoints
app.get('/api/matches', (req, res) => {
  try {
    res.json(getMatches());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/matches', (req, res) => {
  try {
    const { player1Id, player2Id, score1, score2, importance, isKnockout, isPSO, psoWinner } = req.body;
    if (!player1Id || !player2Id || score1 === undefined || score2 === undefined || !importance) {
      return res.status(400).json({ error: 'Missing required match details' });
    }
    const id = addMatch(player1Id, player2Id, score1, score2, importance, isKnockout, isPSO, psoWinner);
    res.status(201).json({ id, message: 'Match logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/matches/:id', (req, res) => {
  try {
    deleteMatch(req.params.id);
    res.json({ message: 'Match reverted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Settings Endpoints
app.post('/api/settings/reset', (req, res) => {
  try {
    resetDatabase();
    res.json({ message: 'Database wiped successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/seed', (req, res) => {
  try {
    seedDatabase();
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/export', (req, res) => {
  try {
    res.json({ players: getPlayers(), matches: getMatches() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/import', (req, res) => {
  try {
    const { players, matches } = req.body;
    if (!players || !matches) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    importData(players, matches);
    res.json({ message: 'Database restored successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback: serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================= SERVER STARTUP =================

function startServer() {
  // 1. Initialize SQLite Database (creates tables if not exist)
  initDb();

  // 2. Auto-seed if empty
  const players = getPlayers();
  if (players.length === 0) {
    console.log('No players found. Auto-seeding database with sample data...');
    seedDatabase();
  }

  // 3. Start Express server on all interfaces (0.0.0.0)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(` eFootball 26 Hostel Rankings Server Running  `);
    console.log(` Local URL:    http://localhost:${PORT}        `);
    console.log(` Network URL:  http://<YOUR-IP>:${PORT}       `);
    console.log(`===============================================`);
  });
}

startServer();
