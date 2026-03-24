import mongoose, { Schema } from 'mongoose';

// ── User ──────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  name:      { type: String, required: true },
  collegeId: { type: String, required: true, unique: true },
  phone:     { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['student', 'admin'], default: 'student' },
}, { timestamps: true });

// ── Operator ──────────────────────────────────────────────────────────────────
const operatorSchema = new Schema({
  operatorId: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  password:   { type: String, required: true },
  busNumber:  String,
  route:      String,
}, { timestamps: true });

// ── Bus ───────────────────────────────────────────────────────────────────────
const busSchema = new Schema({
  busNumber: { type: String, required: true, unique: true },
  route:     { type: String, default: 'Unassigned' },
  latitude:  { type: Number, default: 12.9716 },
  longitude: { type: Number, default: 77.5946 },
  speed:     { type: Number, default: 0 },
  heading:   { type: Number, default: 0 },
  status:    { type: String, enum: ['Active', 'Stopped', 'Offline'], default: 'Offline' },
  lastUpdate:{ type: Date, default: Date.now },
}, { timestamps: true });

// ── Route ─────────────────────────────────────────────────────────────────────
const stopSchema = new Schema({
  name: String, order: Number, expectedTime: Number,
  latitude: Number, longitude: Number,
});

const routeSchema = new Schema({
  routeId:      { type: String, required: true, unique: true },
  name:         String,
  description:  String,
  stops:        [stopSchema],
  price:        Number,
  duration:     String,
  totalDuration:Number,
  startTime:        String,   // morning departure (from first stop)
  eveningStartTime: String,   // evening departure (from SSET, always 16:00)
  active:       { type: Boolean, default: true },
}, { timestamps: true });

// ── Ticket ────────────────────────────────────────────────────────────────────
const ticketSchema = new Schema({
  ticketId:     String,
  userId:       String,
  ticketType:   String,
  route:        String,
  routeName:    String,
  from:         String,
  to:           String,
  amount:       Number,
  paymentMethod:String,
  status:            { type: String, default: 'Active' },
  validUntil:        Date,
  purchaseDate:      Date,
  razorpayOrderId:   String,
  razorpayPaymentId: String,
}, { timestamps: true });

// ── TripHistory ───────────────────────────────────────────────────────────────
const tripHistorySchema = new Schema({
  routeId:       { type: String, required: true },
  fromStop:      { type: String, required: true },
  toStop:        { type: String, required: true },
  dayOfWeek:     Number,
  hourOfDay:     Number,
  actualMinutes: Number,
  recordedAt:    { type: Date, default: Date.now },
});
tripHistorySchema.index({ routeId: 1, fromStop: 1, toStop: 1, hourOfDay: 1 });

// ── PushSubscription ──────────────────────────────────────────────────────────
const pushSubscriptionSchema = new Schema({
  userId:       { type: String, required: true, unique: true },
  subscription: { type: Object, required: true },
  routeId:      { type: String },
  boardingStop: { type: String },           // user's specific boarding stop
  notifyBefore: { type: Number, default: 10 },
  notifiedAt:   { type: Date },
}, { timestamps: true });

// ── Alert ─────────────────────────────────────────────────────────────────────
const alertSchema = new Schema({
  message:    { type: String, required: true },
  busNumber:  { type: String, required: true },
  operatorId: { type: String, required: true },
  active:     { type: Boolean, default: true },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) }, // 2hr TTL
}, { timestamps: true });

export const User       = mongoose.models.User       || mongoose.model('User', userSchema);
export const Operator   = mongoose.models.Operator   || mongoose.model('Operator', operatorSchema);
export const Bus        = mongoose.models.Bus        || mongoose.model('Bus', busSchema);
export const Route      = mongoose.models.Route      || mongoose.model('Route', routeSchema);
export const Ticket     = mongoose.models.Ticket     || mongoose.model('Ticket', ticketSchema);
export const TripHistory= mongoose.models.TripHistory|| mongoose.model('TripHistory', tripHistorySchema);
export const Alert      = mongoose.models.Alert      || mongoose.model('Alert', alertSchema);
export const PushSub    = mongoose.models.PushSub    || mongoose.model('PushSub', pushSubscriptionSchema);
