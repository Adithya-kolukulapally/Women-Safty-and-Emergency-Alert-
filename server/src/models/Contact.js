import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true, trim: true, maxlength: 24 }
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);
