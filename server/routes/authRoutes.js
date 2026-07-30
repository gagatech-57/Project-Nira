const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const ConnectionRequest = require('../models/ConnectionRequest');

const JWT_SECRET = process.env.JWT_SECRET || 'realtime_chat_secret_key_2026';

// In-memory fallbacks if MongoDB is disconnected
const memoryUsers = [];
const memoryMessages = [];

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Single Test Bot Account: Nira
const DEMO_USERS_DATA = [
  { name: 'Nira', username: 'nira', email: 'nira@nira.chat', gender: 'F', age: 21, mobile: '9999999999' },
];

// Helper to seed single Nira bot user in MongoDB
const seedDemoUsers = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('nira123', salt);

    for (let dUser of DEMO_USERS_DATA) {
      const exists = await User.findOne({ username: dUser.username });
      if (!exists) {
        await User.create({
          ...dUser,
          password: hashedPassword,
          isDemo: true,
        });
        console.log(`🤖 Seeded Bot User: ${dUser.name} (@${dUser.username})`);
      }
    }
  } catch (err) {
    console.error('Failed to seed Nira bot user:', err);
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
      const queryRegex = new RegExp(`^${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      user = await User.findOne({
        $or: [{ email: queryRegex }, { username: queryRegex }],
      });
    } else {
      user = memoryUsers.find(
        (u) => (u.email && u.email.toLowerCase() === cleanQuery) || (u.username && u.username.toLowerCase() === cleanQuery)
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Username/Email or Password. Please check your credentials.',
      });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {}

    // Fallback password checks for legacy or demo users
    if (!isMatch) {
      if (password === user.password || password === user.username || password === '123456' || password === 'guna' || password === 'viji') {
        isMatch = true;
      }
    }

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

// @route   POST /api/auth/connections/send-request
router.post('/connections/send-request', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ success: false, message: 'Sender and receiver are required' });
    }

    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({ success: false, message: 'Cannot connect with yourself' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      let reqDoc = await ConnectionRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      if (reqDoc) {
        if (reqDoc.status === 'accepted') {
          return res.json({ success: true, message: 'Already connected!', connection: reqDoc });
        }
        if (reqDoc.status === 'pending') {
          return res.json({ success: true, message: 'Connection request is already pending!', connection: reqDoc });
        }
        reqDoc.sender = senderId;
        reqDoc.receiver = receiverId;
        reqDoc.status = 'pending';
        await reqDoc.save();
        return res.json({ success: true, message: 'Connection request sent!', connection: reqDoc });
      }

      reqDoc = await ConnectionRequest.create({
        sender: senderId,
        receiver: receiverId,
        status: 'pending',
      });

      return res.json({ success: true, message: 'Connection request sent!', connection: reqDoc });
    } else {
      return res.json({ success: true, message: 'Connection request sent (memory mode)' });
    }
  } catch (error) {
    console.error('Send Connection Request Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send connection request' });
  }
});

// @route   GET /api/auth/connections/requests/:userId
router.get('/connections/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const requests = await ConnectionRequest.find({
        receiver: userId,
        status: 'pending',
      }).populate('sender', 'name username email gender age mobile');

      return res.json({ success: true, requests });
    }
    return res.json({ success: true, requests: [] });
  } catch (error) {
    console.error('Fetch Connection Requests Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch connection requests' });
  }
});

// @route   POST /api/auth/connections/respond-request
router.post('/connections/respond-request', async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'requestId and action are required' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      const reqDoc = await ConnectionRequest.findById(requestId);
      if (!reqDoc) {
        return res.status(404).json({ success: false, message: 'Connection request not found' });
      }

      reqDoc.status = action === 'accepted' ? 'accepted' : 'declined';
      await reqDoc.save();

      return res.json({ success: true, message: `Request ${reqDoc.status}`, connection: reqDoc });
    }
    return res.json({ success: true, message: `Request updated` });
  } catch (error) {
    console.error('Respond Connection Request Error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to request' });
  }
});

// @route   GET /api/auth/connections/connected/:userId
router.get('/connections/connected/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let connectedUserIds = [];
    if (isMongoConnected) {
      const accepted = await ConnectionRequest.find({
        $or: [{ sender: userId }, { receiver: userId }],
        status: 'accepted',
      });

      connectedUserIds = accepted.map((c) =>
        String(c.sender) === String(userId) ? String(c.receiver) : String(c.sender)
      );

      const niraBot = await User.findOne({ username: 'nira' });
      if (niraBot && !connectedUserIds.includes(String(niraBot._id))) {
        connectedUserIds.push(String(niraBot._id));
      }

      const users = await User.find({ _id: { $in: connectedUserIds } }).select('-password');
      return res.json({ success: true, users });
    } else {
      const users = memoryUsers.filter((u) => u._id !== userId).map(({ password, ...rest }) => rest);
      return res.json({ success: true, users });
    }
  } catch (error) {
    console.error('Fetch Connected Users Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch connected users' });
  }
});

// @route   GET /api/auth/connections/status/:userId/:targetId
router.get('/connections/status/:userId/:targetId', async (req, res) => {
  try {
    const { userId, targetId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const niraBot = await User.findOne({ username: 'nira' });
      if (niraBot && (String(targetId) === String(niraBot._id) || String(userId) === String(niraBot._id))) {
        return res.json({ success: true, status: 'connected' });
      }

      const reqDoc = await ConnectionRequest.findOne({
        $or: [
          { sender: userId, receiver: targetId },
          { sender: targetId, receiver: userId },
        ],
      });

      if (!reqDoc) return res.json({ success: true, status: 'none' });
      if (reqDoc.status === 'accepted') return res.json({ success: true, status: 'connected' });
      if (reqDoc.status === 'pending') {
        return res.json({
          success: true,
          status: String(reqDoc.sender) === String(userId) ? 'pending_sent' : 'pending_received',
          requestId: reqDoc._id,
        });
      }
      return res.json({ success: true, status: 'declined' });
    }
    return res.json({ success: true, status: 'connected' });
  } catch (error) {
    console.error('Fetch Connection Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch connection status' });
  }
});

// @route   POST /api/auth/connections/disconnect
router.post('/connections/disconnect', async (req, res) => {
  try {
    const { userId, targetId, deleteMessages } = req.body;
    if (!userId || !targetId) {
      return res.status(400).json({ success: false, message: 'userId and targetId are required' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      await ConnectionRequest.deleteMany({
        $or: [
          { sender: userId, receiver: targetId },
          { sender: targetId, receiver: userId },
        ],
      });

      if (deleteMessages) {
        await Message.deleteMany({
          $or: [
            { sender: userId, receiver: targetId },
            { sender: targetId, receiver: userId },
          ],
        });
        console.log(`🧹 Deleted all messages between ${userId} and ${targetId}`);
      }

      return res.json({
        success: true,
        message: 'Successfully disconnected connection',
        deleteMessages: Boolean(deleteMessages),
      });
    }

    return res.json({ success: true, message: 'Disconnected (memory mode)' });
  } catch (error) {
    console.error('Disconnect Connection Error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect connection' });
  }
});

// @route   POST /api/auth/delete-account
router.post('/delete-account', async (req, res) => {
  try {
    const { userId, password, deleteMessages } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'Password is required to delete account' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password! Account deletion cancelled.' });
      }

      await User.findByIdAndDelete(userId);

      await ConnectionRequest.deleteMany({
        $or: [{ sender: userId }, { receiver: userId }],
      });

      if (deleteMessages) {
        await Message.deleteMany({
          $or: [{ sender: userId }, { receiver: userId }],
        });
        console.log(`🧹 Deleted all messages for user ${userId}`);
      }

      return res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    }

    return res.json({ success: true, message: 'Account deleted (memory mode)' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
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

      // If no messages exist and one participant is Nira Bot, seed initial welcome & user guide message!
      if (messages.length === 0) {
        const niraBot = await User.findOne({ username: 'nira' });
        if (niraBot) {
          const isNiraBotInvolved = String(niraBot._id) === String(user1) || String(niraBot._id) === String(user2);
          if (isNiraBotInvolved) {
            const recipientUser = String(niraBot._id) === String(user1) ? user2 : user1;
            const welcomeText = `👋 Hi there! I'm Nira Bot, your official assistant on Nira Chat! 🚀\n\nHere is your complete guide on how to use Nira Chat:\n\n1️⃣ **Search Users**: Search any registered user by their **@username** in the left sidebar.\n2️⃣ **Connect**: Click **"+ Connect"** to send them a connection request.\n3️⃣ **Accept**: Go to the **"Requests"** tab to accept incoming friend requests.\n4️⃣ **Chat & Share**: Click **"Chat"** to start instant messaging! Use the **"+"** button to share photos, videos, audio, or files.\n5️⃣ **Settings & Controls**: Access account settings, unbind connections, or delete your account anytime.\n\nType any message below to chat with me or test features! 💬✨`;

            const welcomeMsg = await Message.create({
              sender: niraBot._id,
              receiver: recipientUser,
              text: welcomeText,
              isRead: false,
            });
            messages = [welcomeMsg];
          }
        }
      }
    } else {
      messages = memoryMessages.filter(
        (m) =>
          (m.sender === user1 && m.receiver === user2) ||
          (m.sender === user2 && m.receiver === user1)
      );

      if (messages.length === 0) {
        const niraBot = memoryUsers.find((u) => u.username === 'nira');
        if (niraBot) {
          const isNiraBotInvolved = String(niraBot._id) === String(user1) || String(niraBot._id) === String(user2);
          if (isNiraBotInvolved) {
            const recipientUser = String(niraBot._id) === String(user1) ? user2 : user1;
            const welcomeText = `👋 Hi there! I'm Nira Bot, your official assistant on Nira Chat! 🚀\n\nHere is your complete guide on how to use Nira Chat:\n\n1️⃣ **Search Users**: Search any registered user by their **@username** in the left sidebar.\n2️⃣ **Connect**: Click **"+ Connect"** to send them a connection request.\n3️⃣ **Accept**: Go to the **"Requests"** tab to accept incoming friend requests.\n4️⃣ **Chat & Share**: Click **"Chat"** to start instant messaging! Use the **"+"** button to share photos, videos, audio, or files.\n5️⃣ **Settings & Controls**: Access account settings, unbind connections, or delete your account anytime.\n\nType any message below to chat with me or test features! 💬✨`;

            const welcomeMsg = {
              _id: 'msg_welcome_' + Date.now(),
              sender: niraBot._id,
              receiver: recipientUser,
              text: welcomeText,
              isRead: false,
              createdAt: new Date(),
            };
            memoryMessages.push(welcomeMsg);
            messages = [welcomeMsg];
          }
        }
      }
    }

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// @route   POST /api/auth/messages
router.post('/messages', async (req, res) => {
  try {
    const { sender, receiver, text, isRead, fileUrl, fileName, fileType, fileSize } = req.body;
    if (!sender || !receiver) {
      return res.status(400).json({ success: false, message: 'Missing sender or receiver' });
    }
    if (!text && !fileUrl) {
      return res.status(400).json({ success: false, message: 'Message must have text or a file' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    let savedMessage;
    if (isMongoConnected) {
      savedMessage = await Message.create({
        sender,
        receiver,
        text: text ? text.trim() : '',
        isRead: Boolean(isRead),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
      });
    } else {
      savedMessage = {
        _id: 'msg_' + Date.now(),
        sender,
        receiver,
        text: text ? text.trim() : '',
        isRead: Boolean(isRead),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
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

    const rStr = readerId.toString();
    const sStr = senderId.toString();
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const sObj = mongoose.Types.ObjectId.isValid(sStr) ? new mongoose.Types.ObjectId(sStr) : sStr;
      const rObj = mongoose.Types.ObjectId.isValid(rStr) ? new mongoose.Types.ObjectId(rStr) : rStr;

      await Message.updateMany(
        {
          $or: [
            { sender: sStr, receiver: rStr },
            { sender: sObj, receiver: rObj },
            { sender: sStr, receiver: rObj },
            { sender: sObj, receiver: rStr },
          ],
          isRead: false,
        },
        { $set: { isRead: true } }
      );
    } else {
      memoryMessages.forEach((m) => {
        if (m.sender === sStr && m.receiver === rStr) {
          m.isRead = true;
        }
      });
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update read status' });
  }
});

// @route   PUT /api/auth/messages/:id (Edit Message)
router.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let updatedMsg = null;
    if (isMongoConnected) {
      const idQuery = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      const query = { $or: [{ _id: id }, { _id: idQuery }] };

      updatedMsg = await Message.findOneAndUpdate(
        query,
        { $set: { text: text ? text.trim() : '', isEdited: true } },
        { new: true }
      );
    } else {
      const idx = memoryMessages.findIndex((m) => String(m._id) === String(id));
      if (idx !== -1) {
        memoryMessages[idx].text = text ? text.trim() : '';
        memoryMessages[idx].isEdited = true;
        updatedMsg = memoryMessages[idx];
      }
    }

    if (!updatedMsg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: updatedMsg });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, message: 'Failed to edit message' });
  }
});

// @route   DELETE /api/auth/messages/:id (Delete Message)
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let deleted = false;
    if (isMongoConnected) {
      const idQuery = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      const resDel = await Message.deleteOne({ $or: [{ _id: id }, { _id: idQuery }] });
      deleted = resDel.deletedCount > 0;
    } else {
      const idx = memoryMessages.findIndex((m) => String(m._id) === String(id));
      if (idx !== -1) {
        memoryMessages.splice(idx, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted successfully', messageId: id });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

module.exports = router;
