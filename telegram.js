const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Telegram Client Setup
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// Initialize Telegram Client
(async () => {
    try {
        console.log("✅ Starting Telegram client...");
        await client.connect();
        console.log("✅ Telegram client connected!");
    } catch (error) {
        console.error("❌ Failed to connect Telegram client:", error);
        process.exit(1);
    }
})();

// API Endpoint
app.post('/fetch-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'No URL provided' });
        }

        console.log(`🔗 Processing URL: ${url}`);
        
        let result;
        if (url.includes('+') || url.includes('joinchat')) {
            // Private invite link
            const hash = url.split('/').pop().replace('+', '');
            result = await client.invoke(new Api.messages.CheckChatInvite({ hash }));
            
            return res.json({
                type: 'private',
                title: result.title,
                membersCount: result.participantsCount,
                photo: result.photo ? 'Photo Available' : 'No Photo'
            });
        } else {
            // Public username link
            const username = url.split('/').pop().replace('@', '');
            const entity = await client.getEntity(username);
            
            return res.json({
                type: 'public',
                title: entity.title,
                photo: entity.photo ? 'Photo Available' : 'No Photo',
                id: entity.id.toString()
            });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return res.status(500).json({ 
            error: 'Failed to fetch group info',
            details: error.message
        });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});