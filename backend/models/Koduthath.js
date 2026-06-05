const mongoose = require('mongoose');

// Each entry = a new payment made (newly I give)
const koduthathSchema = new mongoose.Schema({
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Koduthath', koduthathSchema);
