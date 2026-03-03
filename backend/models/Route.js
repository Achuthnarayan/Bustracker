const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  stops: [{
    type: String
  }],
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Route || mongoose.model('Route', routeSchema);
