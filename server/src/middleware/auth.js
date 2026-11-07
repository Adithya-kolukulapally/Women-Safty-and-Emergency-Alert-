import { createHash } from 'node:crypto';
import Session from '../models/Session.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).select('user');
    if (!session) return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    req.userId = session.user;
    req.sessionTokenHash = tokenHash;
    next();
  } catch (error) {
    next(error);
  }
}
