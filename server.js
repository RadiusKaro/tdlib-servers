const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Create uploads folder if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cors());
app.use('/uploads', express.static(uploadDir));  // Static serve uploads folder

// Telegram Client
const client = new TelegramClient(
  new StringSession(process.env.STRING_SESSION),
  Number(process.env.API_ID),
  process.env.API_HASH,
  { connectionRetries: 5 }
);

// Connect Telegram
(async () => {
  try {
    console.log("⌛ Connecting to Telegram...");
    await client.connect();
    console.log("✅ Telegram client connected!");
  } catch (error) {
    console.error("❌ Telegram connection failed:", error);
    process.exit(1);
  }
})();

// Fetch Info Endpoint
app.post('/fetch-info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL missing" });

    console.log(`🔗 Processing URL: ${url}`);

    let entity;
    let title = 'Unknown';
    let membersCount = 0;
    let photoUrl = null;

    if (url.includes('+') || url.includes('joinchat')) {
      // Private Group
      const hash = url.split('/').pop().replace('+', '');
      let result = await client.invoke(new Api.messages.CheckChatInvite({ hash }));

      if (result.chat) {
        console.log("✅ Already a member of private group.");
        entity = result.chat;
        title = result.chat.title;
        membersCount = result.chat.participantsCount || 0;
      } else {
        console.log("🛫 Not a member, trying to join...");
        const joined = await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        entity = joined.chats[0];
        title = entity.title;
        membersCount = entity.participantsCount || 0;
      }

    } else {
      // Public Group
      const username = url.split('/').pop().replace('@', '');
      entity = await client.getEntity(username);
      title = entity.title;
      membersCount = entity.participantsCount || 0;
    }

    // Download and Save photo
    if (entity.photo) {
      try {
        const buffer = await client.downloadProfilePhoto(entity, { fileSizeLimit: 5 * 1024 * 1024 });
        if (buffer) {
          const filename = `${entity.id}_${Date.now()}.jpg`;
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, buffer);
          photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        }
      } catch (err) {
        console.error("❌ Failed to download photo:", err.message);
      }
    }

    return res.json({
      success: true,
      type: entity.megagroup ? 'supergroup' : 'group',
      title: title,
      id: entity.id.toString(),
      membersCount: membersCount,
      photo: photoUrl || 'Not available'
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      solution: 'Check if URL is correct and session is valid'
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
