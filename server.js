const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const BOT_TOKEN = '7577036209:AAF0thcCRwbkSefwb00jeI-jV3HdTxFFpjI';

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cors());

// Fetch Group Info Endpoint
app.post('/fetch-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate input
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: "Telegram URL required" 
      });
    }

    // Clean URL
    const cleanedUrl = url
      .replace(/https?:\/\/t\.me\//, '')
      .replace(/@/, '')
      .trim();

    // Check for private groups
    if (cleanedUrl.startsWith('+') || cleanedUrl.includes('joinchat')) {
      return res.status(400).json({
        success: false,
        error: "Bot cannot access private groups"
      });
    }

    // Get basic chat info
    const chatResponse = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChat`,
      { params: { chat_id: `@${cleanedUrl}` } }
    );

    if (!chatResponse.data.ok) {
      throw new Error('Invalid group link or bot not authorized');
    }

    const chatData = chatResponse.data.result;

    // Get members count
    const membersResponse = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMembersCount`,
      { params: { chat_id: `@${cleanedUrl}` } }
    );

    // Get photo URL
    let photoUrl = '';
    if (chatData.photo) {
      const fileResponse = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
        { params: { file_id: chatData.photo.small_file_id } }
      );
      
      if (fileResponse.data.ok) {
        photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileResponse.data.result.file_path}`;
      }
    }

    // Successful response
    res.json({
      success: true,
      type: chatData.type,
      title: chatData.title,
      id: chatData.id,
      membersCount: membersResponse.data.result,
      photo: photoUrl || 'No photo available'
    });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.description || error.message;
    
    res.status(500).json({
      success: false,
      error: errorMessage.includes('chat not found') 
        ? 'Bot is not added to this group' 
        : errorMessage
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});