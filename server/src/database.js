import mongoose from 'mongoose';

let connectionPromise;

export function connectDatabase() {
  if (!process.env.MONGODB_URI) return Promise.reject(new Error('MONGODB_URI is not configured.'));
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .then(() => undefined)
      .catch(error => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}
