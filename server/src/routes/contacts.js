import { Router } from 'express';
import Contact from '../models/Contact.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try { res.json({ contacts: await Contact.find({ user: req.userId }).sort({ createdAt: 1 }) }); }
  catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (!name?.trim() || !/^\+?[\d\s().-]{7,24}$/.test(phone || ''))
      return res.status(400).json({ message: 'Enter a contact name and a valid phone number.' });
    if (await Contact.countDocuments({ user: req.userId }) >= 10)
      return res.status(400).json({ message: 'You can save up to 10 trusted contacts.' });
    const contact = await Contact.create({ user: req.userId, name, phone });
    res.status(201).json({ contact });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!contact) return res.status(404).json({ message: 'Contact not found.' });
    res.json({ message: 'Contact removed.' });
  } catch (error) { next(error); }
});

export default router;
