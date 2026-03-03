const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketType: {
    type: String,
    required: true,
    enum: ['Single Trip', 'Daily Pass', 'Weekly Pass', 'Monthly Pass']
  },
  route: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['UPI', 'Card', 'Cash', 'Wallet']
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled'],
    default: 'Active'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
