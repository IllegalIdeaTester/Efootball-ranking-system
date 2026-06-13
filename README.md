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
