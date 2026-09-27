const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const config = require('./setting');
const axios = require('axios');
const path = require('path');

// Owner numbers
const ownerNumber = ["919103902586"];

// ==================== LOCAL FILES LOADER ====================
function loadLocalFiles() {
  console.log("📂 Loading local lib and plugins...");
  
  if (!fs.existsSync('./lib')) {
    console.log("❌ lib folder not found! Creating empty lib folder...");
    fs.mkdirSync('./lib', { recursive: true });
  } else {
    console.log("✅ lib folder found");
    const libFiles = fs.readdirSync('./lib').filter(f => f.endsWith('.js'));
    console.log(`📚 Found ${libFiles.length} lib files`);
  }
  
  if (!fs.existsSync('./plugins')) {
    console.log("❌ plugins folder not found! Creating empty plugins folder...");
    fs.mkdirSync('./plugins', { recursive: true });
  } else {
    console.log("✅ plugins folder found");
    const pluginFiles = fs.readdirSync('./plugins').filter(f => f.endsWith('.js'));
    console.log(`🔌 Found ${pluginFiles.length} plugin files`);
  }
  
  // Check for rauf.html
  if (fs.existsSync('./lib/rauf.html')) {
    console.log("✅ rauf.html found in lib folder");
  } else {
    console.log("⚠️ rauf.html not found in lib folder");
  }
  
  console.log("✅ Local files loaded successfully!");
}

loadLocalFiles();

// Message store for anti-delete
const messageStore = new Map();

// Group settings store (welcome on/off, welcome message, goodbye on/off, goodbye message)
const groupSettings = new Map();

// Default welcome message
const DEFAULT_WELCOME = "╭──❍ *WELCOME* ❍──╮\n│\n├─❍ *User:* @user\n├─❍ *Group:* @group\n├─❍ *Members:* @count\n│\n╰──────────────────────❍\n\n> Enjoy your stay! 🎉";

// Default goodbye message
const DEFAULT_GOODBYE = "╭──❍ *GOODBYE* ❍──╮\n│\n├─❍ *User:* @user\n├─❍ *Group:* @group\n├─❍ *Left the group*\n│\n╰──────────────────────❍\n\n> We'll miss you! 👋";

// Session handling
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const CREDS = path.join(AUTH_DIR, 'creds.json');

if (!fs.existsSync(CREDS)) {
  if (!config.SESSION_ID) {
    console.log("❌ SESSION_ID missing");
    process.exit(1);
  }
  
  let session = config.SESSION_ID.trim();
  if (!session.includes("RAUF-MD~")) {
    console.log("❌ Invalid RAUF-MD session format");
    process.exit(1);
  }
  
  const decoded = Buffer.from(session.substring(7), 'base64').toString('utf8');
  JSON.parse(decoded);
  
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(CREDS, decoded, { encoding: 'utf8' });
  console.log("♻️ RAUF-MD session restored successfully");
}

// Load group settings from file if exists
const SETTINGS_FILE = path.join(__dirname, 'group_settings.json');
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    const savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    for (const [groupId, settings] of Object.entries(savedSettings)) {
      groupSettings.set(groupId, settings);
    }
    console.log("✅ Group settings loaded from file");
  } catch (e) {
    console.log("⚠️ Could not load group settings");
  }
}

// Save group settings to file
function saveGroupSettings() {
  try {
    const settingsObj = {};
    for (const [groupId, settings] of groupSettings.entries()) {
      settingsObj[groupId] = settings;
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsObj, null, 2), 'utf8');
  } catch (e) {
    console.error("❌ Could not save group settings:", e);
  }
}

// Express server for web
const express = require('express');
const app = express();
const port = process.env.PORT || 9090;

// Serve HTML page
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'lib', 'rauf.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RAUF-MD Bot</title>
        <style>
          body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center; padding: 50px; color: white; }
          .container { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 10px; }
          h1 { font-size: 3em; }
          .status { color: #4CAF50; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 RAUF-MD</h1>
          <p class="status">✅ BOT IS CONNECTED</p>
          <p>Type .menu in WhatsApp to see commands</p>
          <p>Owner: ${config.OWNER_NAME || 'RAUF-MD Official'}</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/lib/rauf.html', (req, res) => {
  res.redirect('/');
});

app.listen(port, '0.0.0.0', () => console.log(`🌐 Web server running on port ${port}`));

// Function to get user profile picture
async function getProfilePicture(sock, jid) {
  try {
    const ppUrl = await sock.profilePictureUrl(jid, 'image');
    return ppUrl;
  } catch {
    return 'https://n.uguu.se/BlGoHUJU.jpg'; // Default image
  }
}

// Main bot function
async function connectToWA() {
  console.log("✅ Using local lib and plugins only");
  
  const prefix = config.PREFIX || '.';
  console.log(`🤖 RAUF-MD Connecting with prefix: "${prefix}"`);
  
  const { state: authState, saveCreds: saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
  
  // Load required modules from lib
  let functions, sms, botConfig;
  
  try {
    functions = require('./lib/functions');
    sms = require('./lib/msg').sms;
    botConfig = require('./lib/bot');
    console.log("✅ Lib files loaded successfully");
  } catch (err) {
    console.log("❌ Error loading lib files:", err);
    process.exit(1);
  }
  
  const { getBuffer, getGroupAdmins, fetchJson, runtime, sleep, isUrl, getRandom } = functions;
  
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: true,
    auth: authState,
    version: version
  });

  // Connection update handler
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const statusCode = lastDisconnect.error?.output?.statusCode;
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("❌ Device Logged Out, please delete auth_info_baileys and rescan.");
        process.exit();
      } else if (statusCode === DisconnectReason.connectionReplaced) {
        console.log("❌ Connection replaced. Another session is active.");
        process.exit();
      } else if (lastDisconnect.error?.message?.includes("Bad MAC")) {
        console.log("⚠️ Bad MAC error. Deleting session...");
        fs.rmSync(__dirname + '/auth_info_baileys', { recursive: true, force: true });
        connectToWA();
      } else {
        console.log("🔄 Connection closed, reconnecting...");
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log("✅ RAUF-MD Bot connected to WhatsApp!");
      
      // Load plugins
      console.log("🔌 Loading plugins...");
      const pluginFiles = fs.readdirSync('./plugins/').filter(f => f.endsWith('.js'));
      let loadedCount = 0;
      
      for (const file of pluginFiles) {
        try {
          require('./plugins/' + file);
          loadedCount++;
          console.log(`  ✅ Loaded: ${file}`);
        } catch (err) {
          console.log(`  ❌ Failed to load ${file}: ${err.message}`);
        }
      }
      
      console.log(`✅ Plugins loaded: ${loadedCount}/${pluginFiles.length}`);
      
      // Send connection message with image
      const aliveMsg = `*╭──────────────●●►*\n> *RAUF-MD CONNECTED SUCCESSFULLY*\n\n> *Type ${prefix}menu to view commands*  \n\n*╭⊱✫ RAUF MD ✫⊱╮*\n*│✫📂 Bot Name: ${botConfig.BOT_NAME}*\n*│✫🛡️ Owner: ${config.OWNER_NAME}*\n*│✫♻️ Prefix: ${prefix}*\n*│✫🌍 Mode: ${config.MODE}*\n*│✫⏰ Uptime: ${runtime(process.uptime())}*\n*╰──────────────●●►*\n\n> Enjoy Using RAUF MD`;
      
      // Image URL for connection message
      const imageUrl = 'https://n.uguu.se/BlGoHUJU.jpg';
      
      try {
        // Send to owner with image
        sock.sendMessage(ownerNumber[0] + '@s.whatsapp.net', {
          image: { url: imageUrl },
          caption: aliveMsg
        }).catch(() => {
          // Fallback to text if image fails
          sock.sendMessage(ownerNumber[0] + '@s.whatsapp.net', { text: aliveMsg });
        });
        
        // Send to bot's own number
        sock.sendMessage(sock.user.id, {
          image: { url: imageUrl },
          caption: aliveMsg
        }).catch(() => {
          sock.sendMessage(sock.user.id, { text: aliveMsg });
        });
        
        console.log("✅ Connection message sent with image");
      } catch (err) {
        console.log("⚠️ Could not send connection message with image, sending text only");
        sock.sendMessage(ownerNumber[0] + '@s.whatsapp.net', { text: aliveMsg });
      }
    }
  });

  // Anti-call feature
  const callMsg = `⚠️ *ANTI-CALL IS ACTIVE* ⚠️\n\nDear User,\n\nYou have attempted to call the bot. To ensure uninterrupted service, please refrain from calling.\n\nThank you for your understanding.\n\n${botConfig.COPYRIGHT || 'RAUF-MD'}`;
  
  sock.ev.on('call', async (calls) => {
    if (config.ANTI_CALL === 'true') {
      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.sendMessage(call.from, { text: callMsg });
          await sock.rejectCall(call.id, call.from);
          console.log(`📞 Rejected call from ${call.from}`);
        }
      }
    }
  });

  // Emoji list for auto react
  const emojiList = ['😊', '👍', '😂', '❤️', '🔥', '🥰', '👌', '💯', '🤣', '😎', '✨', '⭐', '🌟', '💫', '⚡', '💥', '🙏', '🎉', '👏', '💯', '👑', '🤖', '🫡', '✅', '🔰', '💚', '💙', '💜', '🖤', '🤍', '💛', '🧡', '💖', '💝', '💞'];
  
  // Creds update
  sock.ev.on('creds.update', saveCreds);
  
  // ==================== GROUP PARTICIPANTS UPDATE (WELCOME/GOODBYE) ====================
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;
      
      if (!id || !participants || !action) return;
      
      const groupMetadata = await sock.groupMetadata(id).catch(() => null);
      if (!groupMetadata) return;
      
      const groupName = groupMetadata.subject || 'Group';
      const groupDesc = groupMetadata.desc || 'No description';
      const memberCount = groupMetadata.participants.length;
      
      // Get group settings
      const settings = groupSettings.get(id) || {
        welcome: true,
        goodbye: true,
        welcomeMsg: DEFAULT_WELCOME,
        goodbyeMsg: DEFAULT_GOODBYE,
        antilink: true,
        antibad: true
      };
      
      for (const participant of participants) {
        const participantJid = participant.split('@')[0];
        const pushName = participant.split('@')[0];
        
        if (action === 'add') {
          // WELCOME MESSAGE - Only if enabled
          if (settings.welcome) {
            try {
              // Get user's profile picture
              const ppUrl = await getProfilePicture(sock, participant);
              
              // Format welcome message with variables
              let welcomeText = settings.welcomeMsg || DEFAULT_WELCOME;
              welcomeText = welcomeText
                .replace(/@user/g, `@${participantJid}`)
                .replace(/@group/g, groupName)
                .replace(/@count/g, memberCount)
                .replace(/@desc/g, groupDesc.substring(0, 100));
              
              // Send welcome message with user's DP
              await sock.sendMessage(id, {
                image: { url: ppUrl },
                caption: welcomeText,
                mentions: [participant]
              }).catch(async () => {
                // Fallback to text if image fails
                await sock.sendMessage(id, {
                  text: welcomeText,
                  mentions: [participant]
                });
              });
              
              console.log(`👋 Welcome message sent to ${participantJid} in ${groupName}`);
            } catch (error) {
              console.error("❌ Welcome message error:", error);
            }
          }
          
        } else if (action === 'remove') {
          // GOODBYE MESSAGE - Only if enabled
          if (settings.goodbye) {
            try {
              // Get user's profile picture
              const ppUrl = await getProfilePicture(sock, participant).catch(() => 'https://n.uguu.se/BlGoHUJU.jpg');
              
              // Format goodbye message with variables
              let goodbyeText = settings.goodbyeMsg || DEFAULT_GOODBYE;
              goodbyeText = goodbyeText
                .replace(/@user/g, `@${participantJid}`)
                .replace(/@group/g, groupName)
                .replace(/@count/g, memberCount);
              
              // Send goodbye message with user's DP
              await sock.sendMessage(id, {
                image: { url: ppUrl },
                caption: goodbyeText,
                mentions: [participant]
              }).catch(async () => {
                // Fallback to text if image fails
                await sock.sendMessage(id, {
                  text: goodbyeText,
                  mentions: [participant]
                });
              });
              
              console.log(`👋 Goodbye message sent for ${participantJid} in ${groupName}`);
            } catch (error) {
              console.error("❌ Goodbye message error:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Welcome/Goodbye error:", error);
    }
  });

  // Main message handler
  sock.ev.on('messages.upsert', async (messageUpdate) => {
    try {
      const msg = messageUpdate.messages[0];
      
      if (!msg || !msg.message) {
        return;
      }
      
      // ============ STATUS HANDLING (FIXED) ============
      if (msg.key && msg.key.remoteJid === 'status@broadcast') {
        
        // AUTO STATUS SEEN - Yeh status ko read karega
        if (config.AUTO_STATUS_MSG === 'true') {
          try {
            await sock.readMessages([msg.key]);
            console.log("📖 Status seen");
            
            // Status par react bhi karega
            const botJid = await jidNormalizedUser(sock.user.id);
            await sock.sendMessage(msg.key.remoteJid, {
              react: {
                key: msg.key,
                text: '💚'
              }
            }, {
              statusJidList: [msg.key.participant, botJid]
            }).catch(() => {});
            
          } catch (error) {
            console.error("❌ Failed to mark status as read:", error);
          }
        }
        
        // AUTO STATUS REPLY - Status uploader ko reply
        if (config.AUTO_STATUS_REPLY === 'true' && msg.key.participant) {
          try {
            const statusReplyMsg = botConfig.STATUS_MSG || 'Thanks for status! ❤️';
            await sock.sendMessage(msg.key.participant, {
              text: statusReplyMsg
            }).catch(() => {});
          } catch (error) {}
        }
        
        return; // Status messages ko further process nahi karna
      }
      
      // Get message type and content
      const msgType = getContentType(msg.message) || 'conversation';
      
      // Get message text
      let body = '';
      if (msgType === 'conversation') {
        body = msg.message.conversation || '';
      } else if (msgType === 'extendedTextMessage') {
        body = msg.message.extendedTextMessage?.text || '';
      } else if (msgType === 'imageMessage') {
        body = msg.message.imageMessage?.caption || '';
      } else if (msgType === 'videoMessage') {
        body = msg.message.videoMessage?.caption || '';
      }
      
      // Create m object
      const m = sms(sock, msg);
      
      // Check if it's a command
      const isCmd = body.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).split(' ')[0].toLowerCase().trim() : '';
      const args = body.split(' ').slice(1);
      const q = args.join(' ');
      const from = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const isGroup = from.endsWith('@g.us');
      const isOwner = ownerNumber.includes(senderNumber);
      const pushName = msg.pushName || senderNumber;
      const botNumberPure = sock.user.id.split(':')[0];
      const isMe = senderNumber === botNumberPure;
      
      // Get mentions
      let mentions = [];
      if (msgType === 'extendedTextMessage' && msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
        mentions = msg.message.extendedTextMessage.contextInfo.mentionedJid;
      }
      
      // Group metadata
      let groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins;
      if (isGroup) {
        groupMetadata = await sock.groupMetadata(from).catch(() => ({}));
        groupName = groupMetadata?.subject || '';
        participants = groupMetadata?.participants || [];
        groupAdmins = participants.filter(p => p.admin).map(p => p.id);
        isBotAdmins = groupAdmins.includes(botNumber);
        isAdmins = groupAdmins.includes(sender);
      }
      
      // Get group settings
      let groupSetting = groupSettings.get(from) || {
        welcome: true,
        goodbye: true,
        welcomeMsg: DEFAULT_WELCOME,
        goodbyeMsg: DEFAULT_GOODBYE,
        antilink: true,
        antibad: true
      };
      
      // Reply function
      const reply = (text) => {
        sock.sendMessage(from, { text }, { quoted: msg });
      };
      
      // Store message for anti-delete
      if (!msg.key.fromMe && msg.key.remoteJid !== 'status@broadcast') {
        messageStore.set(msg.key.id, msg);
        if (messageStore.size > 500) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }
      }
      
      // Log command
      if (isCmd) {
        console.log(`🔍 Command: ${command} from ${pushName} (${senderNumber})`);
      }
      
      // ============ MODE HANDLING ============
      if (config.MODE === 'private' && isCmd && !isOwner) {
        return;
      }
      
      // ============ AUTO REACT ============
      if (config.AUTO_REACT === 'true' && !isCmd && !msg.key.fromMe && !isGroup) {
        const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
        await m.react(randomEmoji).catch(() => {});
      }
      
      // ============ PRESENCE UPDATES ============
      if (config.AUTO_TYPING === 'true' && !msg.key.fromMe) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
      }
      
      if (config.ALWAYS_ONLINE === 'true') {
        await sock.sendPresenceUpdate('available').catch(() => {});
      }
      
      if (config.READ_MESSAGE === 'true' && !msg.key.fromMe) {
        await sock.readMessages([msg.key]).catch(() => {});
      }
      
      // ============ WELCOME/GOODBYE COMMANDS ============
      if (isCmd && isGroup) {
        
        // WELCOME ON/OFF
        if (command === 'welcome') {
          if (!isAdmins && !isOwner) {
            return reply('❌ Only admins can use this command!');
          }
          
          const option = args[0]?.toLowerCase();
          
          if (option === 'on') {
            groupSetting.welcome = true;
            groupSettings.set(from, groupSetting);
            saveGroupSettings();
     
