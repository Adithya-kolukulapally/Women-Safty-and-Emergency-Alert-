import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const tokenFor = user => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = user => ({ id: user.id, name: user.name, email: user.email });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 8)
      return res.status(400).json({ message: 'Enter your name, a valid email, and a password with at least 8 characters.' });
    if (await User.exists({ email: email.toLowerCase().trim() }))
      return res.status(409).json({ message: 'An account with that email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
    if (!user || !await bcrypt.compare(req.body.password || '', user.passwordHash))
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('name email');
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
