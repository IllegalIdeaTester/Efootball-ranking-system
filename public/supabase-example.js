// Client-side Supabase example (ES module)
// Usage:
// 1) In your HTML set globals, e.g.:
//    <script>window.__SUPABASE__ = { url: 'https://your.supabase.co', key: 'anon-key' }</script>
// 2) Include this module: <script type="module" src="/supabase-example.js"></script>
// 3) Import and call functions from other modules or the console.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

let supabase = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) throw new Error('Missing Supabase URL or anon key');
  supabase = createClient(url, anonKey);
  return supabase;
}

function ensureClient() {
  if (supabase) return supabase;
  const env = window.__SUPABASE__ || {};
  if (!env.url || !env.key) throw new Error('Set window.__SUPABASE__ with url and key before calling');
  return initSupabase(env.url, env.key);
}

// Fetch the app state (players + matches) from `app_state` table
export async function fetchAppState() {
  const client = ensureClient();
  const { data, error } = await client.from('app_state').select('key, value');
  if (error) throw error;
  const out = { players: [], matches: [] };
  (data || []).forEach(r => {
    if (r.key === 'players') out.players = r.value || [];
    if (r.key === 'matches') out.matches = r.value || [];
  });
  return out;
}

// Upsert players and matches (array) into app_state table
export async function saveAppState(players, matches) {
  const client = ensureClient();
  const payload = [
    { key: 'players', value: players || [] },
    { key: 'matches', value: matches || [] }
  ];
  const { error } = await client.from('app_state').upsert(payload, { onConflict: 'key' });
  if (error) throw error;
  return { message: 'saved' };
}

// Optional helper: initialize client from window globals if present
if (typeof window !== 'undefined' && window.__SUPABASE__ && !supabase) {
  try { initSupabase(window.__SUPABASE__.url, window.__SUPABASE__.key); }
  catch (e) { console.warn('Supabase example not initialized:', e.message); }
}

// Example helper you can call from the console
export async function exampleLogState() {
  try {
    const state = await fetchAppState();
    console.log('Supabase app_state:', state);
    return state;
  } catch (err) {
    console.error('exampleLogState error:', err.message);
    throw err;
  }
}

// Subscribe to changes on `app_state` table. Calls `onUpdate(key, value, payload)`
// Returns an unsubscribe function.
export function subscribeAppState(onUpdate) {
  if (!supabase) ensureClient();
  const channel = supabase
    .channel('public:app_state')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, (payload) => {
      try {
        const key = payload.new?.key;
        const value = payload.new?.value;
        onUpdate?.(key, value, payload);
      } catch (e) { console.error('subscribeAppState handler error', e); }
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch (e) { console.warn('unsubscribe error', e); }
  };
}
