const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  name: { type: String, required: true },
  iGive: { type: Number, default: 0 },          // manually set initial amount
  koduthathTotal: { type: Number, default: 0 },  // sum of all koduthath entries
  theyGive: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  koduthathUpdatedAt: { type: Date, default: null },
  koduthathUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// kodukkanullath = (iGive + koduthathTotal) - theyGive
personSchema.virtual('kodukkanullath').get(function () {
  return (this.iGive + this.koduthathTotal) - this.theyGive;
});

personSchema.set('toJSON', { virtuals: true });
personSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Person', personSchema);
