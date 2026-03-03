const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  operatorId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  busNumber: {
    type: String,
    required: true,
    trim: true
  },
  route: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: 'operator'
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Operator || mongoose.model('Operator', operatorSchema);
