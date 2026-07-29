const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

const JWT_SECRET = process.env.JWT_SECRET || 'realtime_chat_secret_key_2026';

// In-memory fallbacks if MongoDB is disconnected
const memoryUsers = [];
const memoryMessages = [];

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Demo Users Array for DB Seeding (20 Demo Accounts)
const DEMO_USERS_DATA = [
  { name: 'Alex Turner', username: 'alex_turner', email: 'alex@demo.com', gender: 'M', age: 26, mobile: '+12015550101' },
  { name: 'Sophia Chen', username: 'sophia_chen', email: 'sophia@demo.com', gender: 'F', age: 24, mobile: '+12015550102' },
  { name: 'Marcus Vance', username: 'marcus_vance', email: 'marcus@demo.com', gender: 'M', age: 29, mobile: '+12015550103' },
  { name: 'Elena Rostova', username: 'elena_rostova', email: 'elena@demo.com', gender: 'F', age: 27, mobile: '+12015550104' },
  { name: 'David Beckham', username: 'david_beckham', email: 'david@demo.com', gender: 'M', age: 45, mobile: '+12015550105' },
  { name: 'Jessica Alba', username: 'jessica_alba', email: 'jessica@demo.com', gender: 'F', age: 32, mobile: '+12015550106' },
  { name: 'Liam Neeson', username: 'liam_neeson', email: 'liam@demo.com', gender: 'M', age: 38, mobile: '+12015550107' },
  { name: 'Emma Watson', username: 'emma_watson', email: 'emma@demo.com', gender: 'F', age: 28, mobile: '+12015550108' },
  { name: 'Noah Centineo', username: 'noah_c', email: 'noah@demo.com', gender: 'M', age: 25, mobile: '+12015550109' },
  { name: 'Olivia Wilde', username: 'olivia_wilde', email: 'olivia@demo.com', gender: 'F', age: 30, mobile: '+12015550110' },
  { name: 'Lucas Scott', username: 'lucas_scott', email: 'lucas@demo.com', gender: 'M', age: 27, mobile: '+12015550111' },
  { name: 'Mia Wallace', username: 'mia_wallace', email: 'mia@demo.com', gender: 'F', age: 26, mobile: '+12015550112' },
  { name: 'Ethan Hunt', username: 'ethan_hunt', email: 'ethan@demo.com', gender: 'M', age: 34, mobile: '+12015550113' },
  { name: 'Ava Gardner', username: 'ava_gardner', email: 'ava@demo.com', gender: 'F', age: 29, mobile: '+12015550114' },
  { name: 'Mason Mount', username: 'mason_mount', email: 'mason@demo.com', gender: 'M', age: 23, mobile: '+12015550115' },
  { name: 'Isabella Ross', username: 'isabella_r', email: 'isabella@demo.com', gender: 'F', age: 31, mobile: '+12015550116' },
  { name: 'James Bond', username: 'james_bond', email: 'james@demo.com', gender: 'M', age: 35, mobile: '+12015550117' },
  { name: 'Charlotte G', username: 'charlotte_g', email: 'charlotte@demo.com', gender: 'F', age: 28, mobile: '+12015550118' },
  { name: 'Benjamin Button', username: 'benjamin_b', email: 'benjamin@demo.com', gender: 'M', age: 30, mobile: '+12015550119' },
  { name: 'Amelia Earhart', username: 'amelia_e', email: 'amelia@demo.com', gender: 'F', age: 27, mobile: '+12015550120' },
];

// Helper to seed 20 demo users in MongoDB
const seedDemoUsers = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo1234', salt);

    for (let dUser of DEMO_USERS_DATA) {
      const exists = await User.findOne({ username: dUser.username });
      if (!exists) {
        await User.create({
          ...dUser,
          password: hashedPassword,
          isDemo: true,
        });
        console.log(`🤖 Seeded Demo User: ${dUser.name} (@${dUser.username})`);
      }
    }
  } catch (err) {
    console.error('Failed to seed demo users:', err);
  }
};

// Seed demo users automatically when DB connects
mongoose.connection.on('connected', () => {
  seedDemoUsers();
});

// @route   POST /api/auth/seed-demo-users
router.post('/seed-demo-users', async (req, res) => {
  try {
    await seedDemoUsers();
    res.json({ success: true, message: '20 Demo users seeded successfully in DB!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to seed demo users' });
  }
});

// @route   DELETE /api/auth/demo-users
// @desc    Delete all 20 demo users and their messages from DB
router.delete('/demo-users', async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const demoUsers = await User.find({ isDemo: true });
      const demoUserIds = demoUsers.map((u) => u._id);

      await Message.deleteMany({
        $or: [{ sender: { $in: demoUserIds } }, { receiver: { $in: demoUserIds } }],
      });

      await User.deleteMany({ isDemo: true });
      console.log('🧹 Deleted all 20 demo users and their messages from MongoDB!');
    }

    res.json({ success: true, message: 'Deleted all demo users and messages from DB' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete demo users' });
  }
});

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    let { name, username, email, gender, age, mobile, password } = req.body;

    if (!name || !username || !email || !gender || !age || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: Name, Username (@handle), Email, Gender (M/F), Age, Mobile, and Password.',
      });
    }

    const cleanUsername = username.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').trim();
    const cleanEmail = email.toLowerCase().trim();
    const normalizedGender = gender.toUpperCase();

    if (!['M', 'F', 'OTHER'].includes(normalizedGender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender must be M (Male) or F (Female).',
      });
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid age between 10 and 120.',
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    let existingEmail = null;
    let existingUsername = null;

    if (isMongoConnected) {
      existingEmail = await User.findOne({ email: cleanEmail });
      existingUsername = await User.findOne({ username: cleanUsername });
    } else {
      existingEmail = memoryUsers.find((u) => u.email === cleanEmail);
      existingUsername = memoryUsers.find((u) => u.username === cleanUsername);
    }

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: `Username @${cleanUsername} is already taken. Please choose another username.`,
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let userResponse;

    if (isMongoConnected) {
      const newUser = await User.create({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        gender: normalizedGender === 'M' || normalizedGender === 'F' ? normalizedGender : 'Other',
        age: parsedAge,
        mobile: mobile.trim(),
        password: hashedPassword,
        isDemo: false,
      });

      const token = generateToken(newUser._id);

      userResponse = {
        _id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        gender: newUser.gender,
        age: newUser.age,
        mobile: newUser.mobile,
        createdAt: newUser.createdAt,
        token,
      };
    } else {
      const fakeId = 'mem_' + Date.now();
      const newUser = {
        _id: fakeId,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        gender: normalizedGender === 'M' || normalizedGender === 'F' ? normalizedGender : 'Other',
        age: parsedAge,
        mobile: mobile.trim(),
        password: hashedPassword,
        createdAt: new Date(),
        isDemo: false,
      };
      memoryUsers.push(newUser);

      const token = generateToken(fakeId);

      userResponse = {
        _id: fakeId,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        gender: newUser.gender,
        age: newUser.age,
        mobile: newUser.mobile,
        createdAt: newUser.createdAt,
        token,
      };
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: userResponse,
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { loginIdentifier, email, username, password } = req.body;
    const inputQuery = (loginIdentifier || email || username || '').trim();

    if (!inputQuery || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your Username or Email address and Password.',
      });
    }

    const cleanQuery = inputQuery.replace(/^@/, '').toLowerCase();
    const isMongoConnected = mongoose.connection.readyState === 1;

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({
        $or: [{ email: cleanQuery }, { username: cleanQuery }],
      });
    } else {
      user = memoryUsers.find(
        (u) => u.email === cleanQuery || u.username === cleanQuery
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Username/Email or Password. Please check your credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Username/Email or Password. Please check your credentials.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        gender: user.gender,
        age: user.age,
        mobile: user.mobile,
        createdAt: user.createdAt,
        token,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login process.',
    });
  }
});

// @route   GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const query = (req.query.q || '').replace(/^@/, '').toLowerCase().trim();
    const isMongoConnected = mongoose.connection.readyState === 1;
    let users = [];

    if (isMongoConnected) {
      if (query) {
        users = await User.find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        })
          .select('-password')
          .limit(30);
      } else {
        users = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(50);
      }
    } else {
      users = memoryUsers
        .filter((u) =>
          !query ||
          u.username.includes(query) ||
          u.name.toLowerCase().includes(query) ||
          u.email.includes(query)
        )
        .map(({ password, ...rest }) => rest);
    }

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// @route   GET /api/auth/messages/:user1/:user2
router.get('/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let messages = [];

    if (isMongoConnected) {
      messages = await Message.find({
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 },
        ],
      }).sort({ createdAt: 1 });
    } else {
      messages = memoryMessages.filter(
        (m) =>
          (m.sender === user1 && m.receiver === user2) ||
          (m.sender === user2 && m.receiver === user1)
      );
    }

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// @route   POST /api/auth/messages
router.post('/messages', async (req, res) => {
  try {
    const { sender, receiver, text, isRead } = req.body;
    if (!sender || !receiver || !text) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    let savedMessage;
    if (isMongoConnected) {
      savedMessage = await Message.create({
        sender,
        receiver,
        text: text.trim(),
        isRead: Boolean(isRead),
      });
    } else {
      savedMessage = {
        _id: 'msg_' + Date.now(),
        sender,
        receiver,
        text: text.trim(),
        isRead: Boolean(isRead),
        createdAt: new Date(),
      };
      memoryMessages.push(savedMessage);
    }

    res.status(201).json({ success: true, message: savedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// @route   PUT /api/auth/messages/read
router.put('/messages/read', async (req, res) => {
  try {
    const { readerId, senderId } = req.body;
    if (!readerId || !senderId) {
      return res.status(400).json({ success: false, message: 'Missing reader or sender ID' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      await Message.updateMany(
        { sender: senderId, receiver: readerId, isRead: false },
        { $set: { isRead: true } }
      );
    } else {
      memoryMessages.forEach((m) => {
        if (m.sender === senderId && m.receiver === readerId) {
          m.isRead = true;
        }
      });
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update read status' });
  }
});

module.exports = router;
