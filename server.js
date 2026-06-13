import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ================= SUPABASE SETUP =================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_KEY)) {
  console.error('Missing Supabase environment variables. Provide SUPABASE_URL and either SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY.');
  console.error('Create a .env file (see .env.example) or set them in your hosting dashboard.');
}

// Prefer service role key for server-side writes (safe to keep on server only)
const supabaseKeyToUse = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKeyToUse);
if (SUPABASE_SERVICE_KEY) {
  console.log('Supabase: using service key for server-side operations (recommended for secure writes).');
}

// ================= MIDDLEWARE =================
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ================= SHARED STATE API =================
// The frontend (state.js) does all ranking/Elo computation and simply
// asks the server to load/save the FULL { players, matches } state as
// a JSON blob. This keeps the existing client-side logic untouched
// while making the data shared across every visitor.

app.get('/api/state', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('key, value');

    if (error) throw error;

    const result = { players: [], matches: [] };
    (data || []).forEach(row => {
      if (row.key === 'players' || row.key === 'matches') {
        result[row.key] = row.value || [];
      }
    });

    res.json(result);
  } catch (err) {
    console.error('GET /api/state error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/state', async (req, res) => {
  try {
    const { players, matches } = req.body;

    if (!Array.isArray(players) || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'players and matches must be arrays' });
    }

    const { error } = await supabase
      .from('app_state')
      .upsert([
        { key: 'players', value: players },
        { key: 'matches', value: matches }
      ], { onConflict: 'key' });

    if (error) throw error;

    res.json({ message: 'saved' });
  } catch (err) {
    console.error('POST /api/state error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fallback: serve index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================= SERVER STARTUP =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` eFootball 26 Hostel Rankings Server Running  `);
  console.log(` Local URL:    http://localhost:${PORT}        `);
  console.log(` Network URL:  http://<YOUR-IP>:${PORT}       `);
  console.log(`===============================================`);
});
