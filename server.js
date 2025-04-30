const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cors());

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

// Fetch Info Endpoint - UPDATED SOLUTION
app.post('/fetch-info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL missing" });

    console.log(`🔗 Processing URL: ${url}`);

    let entity;
    let title = 'Unknown';
    let membersCount = 0;
    let photo = 'Not available';

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

    // NEW SOLUTION: Get photo as base64
    if (entity.photo) {
      try {
        const buffer = await client.downloadProfilePhoto(entity, { 
          fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
        });
        
        if (buffer) {
          // Convert to base64
          photo = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
      } catch (err) {
        console.error("❌ Failed to process photo:", err.message);
      }
    }

    return res.json({
      success: true,
      type: entity.megagroup ? 'supergroup' : 'group',
      title: title,
      id: entity.id.toString(),
      membersCount: membersCount,
      photo: photo // Now sending base64 directly
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