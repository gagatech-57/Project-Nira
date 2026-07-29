const mongoose = require('mongoose');
require('dotenv').config();

const LOCAL_URI = 'mongodb://127.0.0.1:27017/realtime_chat_db';
const ATLAS_URI = process.env.MONGODB_URI || 'mongodb+srv://gunaknn_db_user:6zECNdy7uvm1LcGm@cluster0.hqcu6zx.mongodb.net/nira_chat_db?retryWrites=true&w=majority';

async function migrateData() {
  console.log('🚀 Starting Data Migration: Local MongoDB ➡️ MongoDB Atlas Online...\n');

  try {
    // 1. Connect to Local MongoDB
    console.log(`🔌 Connecting to Local MongoDB: ${LOCAL_URI}`);
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to Local MongoDB!');

    const LocalUser = localConn.model('User', new mongoose.Schema({}, { strict: false }));
    const LocalMessage = localConn.model('Message', new mongoose.Schema({}, { strict: false }));

    const localUsers = await LocalUser.find({});
    const localMessages = await LocalMessage.find({});

    console.log(`📦 Found in Local Database:`);
    console.log(`   - Users: ${localUsers.length}`);
    console.log(`   - Messages: ${localMessages.length}\n`);

    if (localUsers.length === 0 && localMessages.length === 0) {
      console.log('ℹ️ No local data found to migrate.');
      await localConn.close();
      process.exit(0);
    }

    // 2. Connect to Online MongoDB Atlas
    console.log(`🌐 Connecting to Online MongoDB Atlas...`);
    const atlasConn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log('✅ Connected to Online MongoDB Atlas!');

    const AtlasUser = atlasConn.model('User', new mongoose.Schema({}, { strict: false }));
    const AtlasMessage = atlasConn.model('Message', new mongoose.Schema({}, { strict: false }));

    // Map local user IDs to Atlas user IDs
    const userIdMap = new Map();

    // 3. Migrate / Sync Users by username & email
    let userMigratedCount = 0;
    for (let userDoc of localUsers) {
      const uObj = userDoc.toObject();
      const localIdStr = uObj._id.toString();

      // Check if user already exists in Atlas by username or email
      let existingAtlasUser = await AtlasUser.findOne({
        $or: [
          { _id: uObj._id },
          { username: uObj.username },
          { email: uObj.email }
        ]
      });

      if (existingAtlasUser) {
        userIdMap.set(localIdStr, existingAtlasUser._id.toString());
        await AtlasUser.updateOne(
          { _id: existingAtlasUser._id },
          { $set: { name: uObj.name, gender: uObj.gender, age: uObj.age, mobile: uObj.mobile, password: uObj.password } }
        );
      } else {
        const newUser = await AtlasUser.create(uObj);
        userIdMap.set(localIdStr, newUser._id.toString());
      }
      userMigratedCount++;
    }
    console.log(`✅ Synced/Migrated ${userMigratedCount} Users to MongoDB Atlas!`);

    // 4. Migrate Messages with mapped User IDs
    let msgMigratedCount = 0;
    for (let msgDoc of localMessages) {
      const mObj = msgDoc.toObject();
      
      const mappedSender = userIdMap.get(mObj.sender?.toString()) || mObj.sender;
      const mappedReceiver = userIdMap.get(mObj.receiver?.toString()) || mObj.receiver;

      mObj.sender = mappedSender;
      mObj.receiver = mappedReceiver;

      await AtlasMessage.updateOne(
        { _id: mObj._id },
        { $set: mObj },
        { upsert: true }
      );
      msgMigratedCount++;
    }
    console.log(`✅ Synced/Migrated ${msgMigratedCount} Messages to MongoDB Atlas!\n`);

    console.log('🎉 Data Migration Completed Successfully!');

    await localConn.close();
    await atlasConn.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
}

migrateData();
