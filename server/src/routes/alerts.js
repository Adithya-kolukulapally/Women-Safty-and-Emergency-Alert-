import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const validCoordinates = ({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

router.post('/', (req, res) => {
  if (!validCoordinates(req.body)) return res.status(400).json({ message: 'A valid location is required to start an alert.' });
  res.status(201).json({ startedAt: new Date().toISOString(), locationUrl: `https://maps.google.com/?q=${req.body.latitude},${req.body.longitude}` });
});

router.post('/location', (req, res) => {
  if (!validCoordinates(req.body)) return res.status(400).json({ message: 'Invalid location coordinates.' });
  // Live coordinates are intentionally acknowledged without being stored or logged.
  res.sendStatus(204);
});

router.post('/stop', (_req, res) => res.json({ stoppedAt: new Date().toISOString() }));
export default router;
