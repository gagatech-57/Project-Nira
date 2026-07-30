const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const Message = require('./models/Message');
const User = require('./models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 20e6, // 20 MB for base64 image messages
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '_' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// Middleware with full CORS support for Vercel and external domains
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const mimeType = req.file.mimetype;
  let fileType = 'document';
  if (mimeType.startsWith('image/')) fileType = 'image';
  else if (mimeType.startsWith('video/')) fileType = 'video';
  else if (mimeType.startsWith('audio/')) fileType = 'audio';

  res.json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType,
    fileSize: req.file.size,
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Serve static client build if present (for single full-stack deploy on Render)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Nira Chat Real-Time API',
    mongodb: require('mongoose').connection.readyState === 1 ? 'Connected' : 'Disconnected (Memory Mode)',
    time: new Date().toISOString(),
  });
});

// Real-Time Socket.IO Messaging Engine & Demo Auto-Reply System
const onlineUsers = new Map(); // userId -> socketId
const activeChats = new Map(); // userId -> activePartnerId

function generateDemoReply(text, demoUserName) {
  const lower = text.toLowerCase().trim();

  if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower.includes('hi ') || lower.includes('hello ')) {
    return `Hello! 👋 I'm Nira! Nice to connect with you! How can I help you today?`;
  }
  if (lower.includes('how are you') || lower.includes('how r u')) {
    return `I'm doing awesome, thanks for asking! 😊 How are you doing today?`;
  }
  if (lower.includes('what tell') || lower.includes('tell') || lower.includes('what do you do')) {
    return `I am Nira, your real-time assistant on Nira Chat! 🚀`;
  }
  if (lower.includes('bye') || lower.includes('see you') || lower.includes('tc')) {
    return `Take care! Talk to you soon! 👋✨`;
  }
  if (lower.includes('name') || lower.includes('who are you')) {
    return `I'm Nira! 🌟 Registered test AI on Nira Chat!`;
  }

  const responses = [
    `Thanks for your message: "${text}"! Great to chat with you on Nira Chat! 🔥`,
    `Got your message! Hope you're having a wonderful day! 😄`,
    `Awesome! Testing real-time chat with Nira is working great! 👍`,
    `That sounds wonderful! Tell me more! 😊`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

io.on('connection', (socket) => {
  console.log(`🔌 New Socket Client Connected: ${socket.id}`);

  socket.on('user_online', (rawUserId) => {
    if (!rawUserId) return;
    const userId = rawUserId.toString();
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    io.emit('get_online_users', Array.from(onlineUsers.keys()));
    console.log(`👤 User Online & Joined Room: ${userId} (${socket.id})`);
  });

  socket.on('active_chat_changed', async ({ userId, partnerId }) => {
    if (!userId) return;
    const uStr = userId.toString();
    const pStr = partnerId ? partnerId.toString() : null;

    if (pStr) {
      activeChats.set(uStr, pStr);

      try {
        if (require('mongoose').connection.readyState === 1) {
          await Message.updateMany(
            { sender: pStr, receiver: uStr, isRead: false },
            { $set: { isRead: true } }
          );
        }
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }

      io.to(pStr).emit('messages_read', { readerId: uStr, partnerId: pStr });
    } else {
      activeChats.delete(uStr);
    }
  });

  socket.on('mark_read_instant', async ({ readerId, senderId }) => {
    if (!readerId || !senderId) return;
    const rStr = readerId.toString();
    const sStr = senderId.toString();

    io.to(sStr).emit('messages_read', { readerId: rStr, partnerId: sStr });

    try {
      if (require('mongoose').connection.readyState === 1) {
        const mongoose = require('mongoose');
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
      }
    } catch (err) {
      console.error('Error updating read status:', err);
    }
  });

  socket.on('edit_message', ({ messageId, receiverId, text }) => {
    if (!messageId || !receiverId) return;
    const rStr = receiverId.toString();
    io.to(rStr).emit('message_edited', { messageId, text, isEdited: true });
  });

  socket.on('delete_message', ({ messageId, receiverId }) => {
    if (!messageId || !receiverId) return;
    const rStr = receiverId.toString();
    io.to(rStr).emit('message_deleted', { messageId });
  });

  socket.on('send_connection_request', ({ senderId, receiverId, senderUser }) => {
    if (!receiverId) return;
    const rStr = receiverId.toString();
    io.to(rStr).emit('receive_connection_request', { senderId, senderUser });
  });

  socket.on('respond_connection_request', ({ senderId, receiverId, action }) => {
    if (!senderId) return;
    const sStr = senderId.toString();
    io.to(sStr).emit('connection_request_responded', { receiverId, action });
  });

  socket.on('send_message', async (data) => {
    const { sender, receiver, text, createdAt, _id, fileUrl, fileName, fileType, fileSize } = data;
    if (!sender || !receiver) return;
    if (!text && !fileUrl) return;

    const senderStr = sender.toString();
    const receiverStr = receiver.toString();

    const receiverActivePartner = activeChats.get(receiverStr);
    const isRecipientViewingChat = receiverActivePartner === senderStr;

    const formattedData = {
      _id: _id || 'msg_' + Date.now(),
      sender: senderStr,
      receiver: receiverStr,
      text: text ? text.trim() : '',
      isRead: isRecipientViewingChat,
      createdAt: createdAt || new Date().toISOString(),
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      fileSize: fileSize || null,
    };

    console.log(`💬 Message sent from ${senderStr} to ${receiverStr}`);

    // Live broadcast to receiver
    io.to(receiverStr).emit('receive_message', formattedData);

    if (isRecipientViewingChat) {
      io.to(senderStr).emit('messages_read', { readerId: receiverStr, partnerId: senderStr });
    }

    // CHECK IF RECEIVER IS A DEMO USER IN MONGODB & TRIGGER REAL-TIME AUTO-REPLY
    try {
      if (require('mongoose').connection.readyState === 1) {
        const receiverUser = await User.findById(receiverStr);

        if (receiverUser && receiverUser.isDemo) {
          console.log(`🤖 DEMO USER DETECTED (${receiverUser.name}). Generating automatic reply...`);

          // Simulate short typing delay (1.2 seconds)
          setTimeout(async () => {
            const autoReplyText = generateDemoReply(text, receiverUser.name);

            // SAVE REPLY IN MONGODB (NOT LOCALSTORAGE)
            const replyMsg = await Message.create({
              sender: receiverStr,
              receiver: senderStr,
              text: autoReplyText,
              isRead: true,
            });

            const replyData = {
              _id: replyMsg._id.toString(),
              sender: receiverStr,
              receiver: senderStr,
              text: autoReplyText,
              isRead: true,
              createdAt: replyMsg.createdAt.toISOString(),
            };

            console.log(`💬 DEMO AUTO-REPLY SENT FROM ${receiverUser.name}: "${autoReplyText}"`);

            // Emit live reply to sender room
            io.to(senderStr).emit('receive_message', replyData);
            io.to(senderStr).emit('messages_read', { readerId: receiverStr, partnerId: senderStr });
          }, 1200);
        }
      }
    } catch (err) {
      console.error('Error handling demo user reply:', err);
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        activeChats.delete(userId);
        break;
      }
    }
    io.emit('get_online_users', Array.from(onlineUsers.keys()));
    if (disconnectedUserId) {
      console.log(`❌ User Disconnected: ${disconnectedUserId}`);
    }
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`💬 Socket.io server ready for real-time messaging on port ${PORT}`);
  });
});
