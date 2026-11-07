# SafeHer | Personal safety network

A MERN application for managing trusted emergency contacts and sharing a location when the user deliberately starts an alert.

## Stack

- **Client:** React, Vite, React Router
- **Server:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Authentication:** bcrypt password hashes and random, revocable MongoDB-backed sessions

## Run locally

1. Install Node.js 20+ and start a local MongoDB server (or use a MongoDB Atlas URI).
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.
3. From this folder run `npm install`, then `npm run dev`.
4. Open the Vite URL printed in the terminal (usually http://localhost:5173).

The API runs on port 5000. The client calls it through the Vite `/api` proxy.

## Deploy to Render

This repository includes `render.yaml` for a single Node web service. Render should run `npm ci && npm run build` and then `npm start`; Express serves the built React client and the API from the same URL. Set `MONGODB_URI` to the Atlas connection string in the Render service environment. Do not upload `server/.env`.

If deploying through an existing Render service instead of creating/syncing the Blueprint, change its runtime from Python to Node, set the build command to `npm ci && npm run build`, and the start command to `npm start`. Add `MONGODB_URI` as a Render environment variable.

## Safety behavior

The app does not send SMS or call emergency services. Starting an alert requests browser location permission and opens the device's SMS composer addressed to saved contacts, with a location link in the message. The user must review and send it. Live sharing is visible in the app, can be stopped at any time, and coordinates are sent to the API only while active; the API does not store or log them. Use a real SMS provider and deployment-grade security before relying on this in an emergency.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/contacts`, `POST /api/contacts`, `DELETE /api/contacts/:id`
- `POST /api/alerts`, `POST /api/alerts/location`, `POST /api/alerts/stop`
- `GET /api/health`
