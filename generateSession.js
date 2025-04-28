const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();

(async () => {
  console.log("📱 Starting Telegram session generation...");
  
  const client = new TelegramClient(
    new StringSession(""), // Empty session
    Number(process.env.API_ID),
    process.env.API_HASH,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await input.text("Enter your phone number (with country code): "),
    password: async () => await input.text("Enter your 2FA password (if any): "),
    phoneCode: async () => await input.text("Enter the OTP code you received: "),
    onError: (err) => console.error("❌ Error:", err),
  });

  console.log("\n✅ Login successful!");
  console.log("🔑 Your SESSION STRING (copy this):");
  console.log("\n" + client.session.save() + "\n");
  console.log("👉 Paste this in your .env file as STRING_SESSION");
  
  await client.disconnect();
  process.exit();
})();