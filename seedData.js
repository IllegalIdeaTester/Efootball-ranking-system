import { addPlayer, addMatch, resetDatabase } from './db.js';

/**
 * Resets the SQLite database and seeds it with default hostel players and matches.
 * Uses synchronous better-sqlite3 API (no async/await needed).
 */
export function seedDatabase() {
  console.log('Seeding SQLite database with default records...');

  // 1. Wipe current tables
  resetDatabase();

  // 2. Register players (returns SQLite row IDs)
  const p1 = addPlayer("Tunde 'The Wall' Cole", "Room 105", "Paris Saint-Germain", 1150);
  const p2 = addPlayer("Chinedu 'Sniper' Obi", "Room 203", "Real Madrid", 1080);
  const p3 = addPlayer("Emeka 'Joga Bonito' Kalu", "Room 304", "Manchester City", 1020);
  const p4 = addPlayer("Kelechi 'Goal Machine' Eze", "Room 112", "FC Barcelona", 1000);
  const p5 = addPlayer("Abiola 'Tactician' Alao", "Room 215", "Bayern Munich", 950);
  const p6 = addPlayer("Femi 'Super Sub' Johnson", "Room 108", "Arsenal FC", 900);

  // 3. Register matches chronologically
  addMatch(p1, p2, 3, 1, 5, false, false);    // Day 1: Casual Friendly (PSG vs Real Madrid)
  addMatch(p3, p4, 2, 2, 15, false, false);   // Day 2: League Match (Man City vs Barcelona)
  addMatch(p4, p5, 4, 0, 5, false, false);    // Day 3: Casual Friendly (Barcelona vs Bayern)
  addMatch(p1, p3, 2, 3, 10, false, false);   // Day 4: Hostel Derby (PSG vs Man City)
  addMatch(p2, p6, 2, 1, 15, false, false);   // Day 5: League Match (Real Madrid vs Arsenal)
  addMatch(p5, p6, 1, 1, 15, false, false);   // Day 6: League Match (Bayern vs Arsenal)
  addMatch(p1, p2, 1, 1, 35, false, false);   // Day 7: Cup Group Stage (PSG vs Real Madrid)
  addMatch(p3, p4, 1, 2, 35, false, false);   // Day 8: Cup Group Stage (Man City vs Barcelona)
  addMatch(p2, p4, 2, 2, 50, true, true, 'B'); // Day 9: Cup Semifinal PSO (Real Madrid vs Barcelona)
  addMatch(p1, p4, 3, 2, 60, true, false);    // Day 10: Cup Grand Final (PSG vs Barcelona)

  console.log('Database successfully seeded!');
}
