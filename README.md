# eFootball Rankings

Hostel rankings dashboard for eFootball 26 gamers using a FIFA Elo-style ranking system.

## Overview

This project provides a web-based ranking system for tracking player performance, matches, and Elo ratings.
It includes a static frontend served from `public/` and an Express backend that exposes REST APIs for players, matches, and settings.

## Features

- Register players with room, team, and starting points
- Log match results and update Elo rankings
- Remove players and associated matches
- Reset or seed the database with sample data
- Export/import backup data through API endpoints
- Static frontend served from `public/index.html`

## Tech Stack

- Node.js
- Express
- JavaScript ES Modules
- Static HTML/CSS/JS frontend

## Setup

1. Open a terminal in the project root:

```powershell
cd C:\Users\Bopdaddy\Desktop\Rankings
```

2. Install dependencies:

```powershell
npm install
```

or, if you use pnpm:

```powershell
pnpm install
```

3. Start the server:

```powershell
npm start
```

4. Open the app in your browser:

```text
http://localhost:3000
```

## API Endpoints

- `GET /api/players` - list players
- `POST /api/players` - create a new player
- `DELETE /api/players/:id` - delete a player and related matches
- `GET /api/matches` - list matches
- `POST /api/matches` - create a match result
- `DELETE /api/matches/:id` - remove a match
- `POST /api/settings/reset` - reset the database
- `POST /api/settings/seed` - seed sample data
- `GET /api/settings/export` - export current data
- `POST /api/settings/import` - import exported data

## Project Structure

- `server.js` - Express server and API routes
- `db.js` - database helpers and persistence logic
- `seedData.js` - initial seed data loader
- `public/` - frontend UI files
- `package.json` - project metadata and scripts

## Notes

- Make sure `git` and Node.js are installed.
- The repo currently uses the `main` branch.

## License

This project does not include a license file. Add one if you want to make the project open source.

## Supabase Setup

1. Create a free project at https://app.supabase.com and note your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Add them to a local `.env` file (see `.env.example`).

3. Create the `app_state` table (use the SQL editor in Supabase):

```sql
-- Create table to store app state as key/value JSON
create table if not exists app_state (
	key text primary key,
	value jsonb
);

-- Optional: initialize empty state rows
insert into app_state (key, value) values
('players', '[]'::jsonb)
on conflict (key) do nothing;

insert into app_state (key, value) values
('matches', '[]'::jsonb)
on conflict (key) do nothing;
```

4. Run the server locally (it uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `.env`):

```powershell
npm install
npm start
```

The app's server (`server.js`) already initializes a Supabase client and reads/writes the `app_state` table via the `/api/state` endpoints.

### Secure writes with Row Level Security (recommended)

If you enable Row Level Security (RLS) on the `app_state` table you should make sure only the server (using a service role key) can perform inserts/updates, while clients can only read. Example SQL:

```sql
-- Enable RLS
alter table app_state enable row level security;

-- Allow public (anon) users to SELECT rows
create policy "allow_select_for_public" on app_state
	for select
	using (true);

-- Deny inserts/updates from anon clients by default (no policy)

-- Create policy to allow server service role to bypass RLS (service key always bypasses RLS when used server-side)
-- Note: service role key must be kept secret and only used on server-side.
```

Recommended server config:
- Set `SUPABASE_SERVICE_KEY` (service role key) in your server environment (see `.env.example`).
- In `server.js` the code will prefer `SUPABASE_SERVICE_KEY` for server-side operations; this lets your server perform upserts while anonymous browser clients only have read access.

Security note: Never embed the service role key in client-side code or commit it to source control. Use your hosting provider's secret management to store `SUPABASE_SERVICE_KEY`.
