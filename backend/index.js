import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/volleydata';

const ADMIN_PIN = process.env.ADMIN_PIN || '062026';
if (!process.env.ADMIN_PIN) {
  console.warn('WARNING: ADMIN_PIN env var not set. Falling back to the insecure default PIN — set ADMIN_PIN in your deployment environment.');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Legacy hashing, kept only to verify passwords created before the bcrypt migration.
const hashPasswordLegacy = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const isBcryptHash = (hash) => typeof hash === 'string' && /^\$2[aby]?\$/.test(hash);

const hashPassword = (password) => bcrypt.hash(password, 10);

// Verifies against bcrypt hashes, falling back to the legacy SHA-256 scheme
// for accounts that haven't logged in since the migration.
const verifyPassword = async (password, storedHash) => {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }
  return hashPasswordLegacy(password) === storedHash;
};

const parseExpiryDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  
  const dateStr = String(dateVal).trim();
  // Check if it matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Set to 23:59:59.999 in Thailand timezone (+07:00) so the account is valid until the end of that day
    return new Date(`${dateStr}T23:59:59.999+07:00`);
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Match schemas
const MatchStateSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  status: String,
  teamNames: mongoose.Schema.Types.Mixed,
  matchInfo: mongoose.Schema.Types.Mixed,
  score: mongoose.Schema.Types.Mixed,
  setsWon: mongoose.Schema.Types.Mixed,
  timeouts: mongoose.Schema.Types.Mixed,
  currentServe: String,
  rotations: mongoose.Schema.Types.Mixed,
  roster: mongoose.Schema.Types.Mixed,
  liberoSwaps: mongoose.Schema.Types.Mixed,
  tempRallyEvents: Array,
  events: Array,
  setScores: Array,
  createdBy: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
});

const MatchState = mongoose.model('MatchState', MatchStateSchema);

const MatchHistorySchema = new mongoose.Schema({
  roomId: String,
  savedAt: { type: Number, default: Date.now },
  teamNames: mongoose.Schema.Types.Mixed,
  matchInfo: mongoose.Schema.Types.Mixed,
  score: mongoose.Schema.Types.Mixed,
  events: Array,
  roster: mongoose.Schema.Types.Mixed,
  setScores: Array
});

const MatchHistory = mongoose.model('MatchHistory', MatchHistorySchema);

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expiresAt: { type: Date, default: null }, // Null means unlimited
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Seed default administrator if not present
const seedDefaultUser = async () => {
  try {
    const adminExists = await User.findOne({ username: 'vbdata01' });
    if (!adminExists) {
      const defaultAdmin = new User({
        username: 'vbdata01',
        password: await hashPassword('vddata01th'),
        expiresAt: null,
        isAdmin: true
      });
      await defaultAdmin.save();
      console.log('Seeded default user: vbdata01 / vddata01th');
    } else if (!adminExists.isAdmin) {
      adminExists.isAdmin = true;
      await adminExists.save();
      console.log('Updated default user vbdata01 to Admin');
    }

    const newAdminExists = await User.findOne({ username: 'vdata2026' });
    if (!newAdminExists) {
      const newAdmin = new User({
        username: 'vdata2026',
        password: await hashPassword('062026'),
        expiresAt: null,
        isAdmin: true
      });
      await newAdmin.save();
      console.log('Seeded user: vdata2026 / 062026');
    } else if (!newAdminExists.isAdmin) {
      newAdminExists.isAdmin = true;
      await newAdminExists.save();
      console.log('Updated user vdata2026 to Admin');
    }
  } catch (err) {
    console.error('Error seeding default users:', err);
  }
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    seedDefaultUser();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// --- Authentication REST APIs ---

// 1. User login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(400).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    // Transparently upgrade legacy SHA-256 hashes to bcrypt on next successful login
    if (!isBcryptHash(user.password)) {
      user.password = await hashPassword(password);
      await user.save();
    }

    // Check if account has expired
    if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
      return res.status(403).json({ error: 'บัญชีนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบ' });
    }
    
    res.json({ id: user._id, username: user.username, expiresAt: user.expiresAt, isAdmin: user.isAdmin || false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Public sign up (Optional, fallback setup helper)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }
  try {
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'Username นี้ถูกใช้งานไปแล้ว' });
    }
    const user = new User({
      username,
      password: await hashPassword(password),
      expiresAt: null
    });
    await user.save();
    res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get all users (Admin only)
app.get('/api/auth/users', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการเข้าถึงข้อมูล' });
  }
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Create user (Admin only)
app.post('/api/auth/users', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการสร้างผู้ใช้' });
  }
  const { username, password, expiresAt } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }
  try {
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: 'Username นี้ถูกใช้งานไปแล้ว' });
    }
    const newUser = new User({
      username,
      password: await hashPassword(password),
      expiresAt: parseExpiryDate(expiresAt)
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update user expiry (Admin only)
app.put('/api/auth/users/:id/expiry', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการแก้ไขข้อมูล' });
  }
  const { expiresAt } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { expiresAt: parseExpiryDate(expiresAt) }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user admin status (Admin only)
app.put('/api/auth/users/:id/role', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการแก้ไขข้อมูล' });
  }
  const { isAdmin } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isAdmin }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Reset user password (Admin only)
app.put('/api/auth/users/:id/password', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการแก้ไขข้อมูล' });
  }
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านใหม่' });
  }
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { password: await hashPassword(password) }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Delete user (Admin only)
app.delete('/api/auth/users/:id', async (req, res) => {
  const adminPin = req.headers['x-admin-pin'];
  if (adminPin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการลบข้อมูล' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (user && user.username === 'vbdata01') {
      return res.status(400).json({ error: 'ไม่สามารถลบบัญชีผู้ดูแลระบบหลักได้' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Match Storage REST APIs ---

// 1. Get active match state for a room
app.get('/api/matches/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const cleanId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
  if (!cleanId) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }
  try {
    const match = await MatchState.findOne({ roomId: cleanId });
    if (!match) {
      return res.json({ notFound: true });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Initialize active match state
app.post('/api/matches/:roomId/init', async (req, res) => {
  const { roomId } = req.params;
  const initialState = req.body || {};
  const cleanId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
  if (!cleanId) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }
  try {
    let match = await MatchState.findOne({ roomId: cleanId });
    if (!match) {
      match = new MatchState({
        roomId: cleanId,
        ...initialState
      });
      await match.save();
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2.5. Get all active rooms
app.get('/api/rooms', async (req, res) => {
  const { username } = req.query;
  try {
    let query = {};
    if (username) {
      const user = await User.findOne({ username });
      const isAdmin = user && (user.isAdmin || user.username === 'vbdata01' || user.username === 'vdata2026');
      if (!isAdmin) {
        query = { createdBy: username };
      }
    } else {
      query = { createdBy: '__none__' };
    }
    const rooms = await MatchState.find(query, 'roomId status score teamNames createdBy updatedAt').sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2.6. Delete an active room
app.delete('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const cleanId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
  if (!cleanId) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }
  try {
    const result = await MatchState.deleteOne({ roomId: cleanId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบห้องที่ต้องการลบ' });
    }
    res.json({ message: `ลบห้อง ${cleanId} สำเร็จ` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Save match to history
app.post('/api/history', async (req, res) => {
  try {
    const history = new MatchHistory(req.body);
    await history.save();
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io real-time connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    const cleanId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
    if (!cleanId) return;
    socket.join(cleanId);
    console.log(`Socket ${socket.id} joined room ${cleanId}`);
  });

  socket.on('update_match', async ({ roomId, matchData }, ack) => {
    const cleanId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
    if (!cleanId || !matchData || typeof matchData !== 'object') {
      if (typeof ack === 'function') ack({ ok: false, error: 'invalid_payload' });
      return;
    }
    try {
      // Save to MongoDB
      await MatchState.findOneAndUpdate(
        { roomId: cleanId },
        { ...matchData, updatedAt: Date.now() },
        { upsert: true, new: true }
      );
      // Broadcast to other clients in the same room
      socket.to(cleanId).emit('match_updated', matchData);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (error) {
      console.error('Error updating match state in MongoDB:', error);
      if (typeof ack === 'function') ack({ ok: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Express & Socket.io server running on port ${PORT}`);
});
