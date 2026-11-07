import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './database.js';

const port = process.env.PORT || 5000;
await connectDatabase();
app.listen(port, '0.0.0.0', () => console.log(`SafeHer API ready on port ${port}`));
