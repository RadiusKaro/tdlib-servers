const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // for OTP input
require("dotenv").config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(""); // Empty at first

(async () => {
  console.log("Starting first-time login...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password (if 2FA enabled): "),
    phoneCode: async () => await input.text("Please enter the OTP code: "),
    onError: (err) => console.log(err),
  });
  console.log("Login successful!");
  console.log("Your SESSION STRING: ");
  console.log(client.session.save());
  console.log("\n👉 Copy this session string and paste it inside your `.env` file under `STRING_SESSION`");
  await client.disconnect();
})();
