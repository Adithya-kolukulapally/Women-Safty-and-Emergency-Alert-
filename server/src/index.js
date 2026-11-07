import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import alertRoutes from './routes/alerts.js';

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error('Set MONGODB_URI and JWT_SECRET in server/.env');
  process.exit(1);
}

const app = express();
const clientBuildPath = fileURLToPath(new URL('../../client/dist/', import.meta.url));
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/alerts', alertRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found.' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});
app.use((error, _req, res, _next) => {
  if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
  console.error(error.message);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 5000;
await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => console.log(`SafeHer API ready on http://localhost:${port}`));
