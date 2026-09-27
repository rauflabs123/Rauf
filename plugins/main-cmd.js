const {cmd , commands} = require('../lib/command')
const os = require("os")
const { runtime } = require('../lib/functions')
const hrs = new Date().getHours({ timeZone: 'Asia/Colombo' })
const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const axios = require('axios');
const { fakevCard } = require('../lib/fakevCard');
const bot = require('../lib/bot')
const config = require('../setting')
//========================================About==================================================
cmd({
    pattern: "about",
    react: "👑",
    desc: "get owner dec",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, contextInfo, pushname, reply}) => {
try{

    var time = new Date().toLocaleString('HI', { timeZone: 'Asia/Colombo' }).split(' ')[1]
    var date = new Date().toLocaleDateString(get_localized_date)
    var am_pm = ''
    if (hrs < 12) am_pm = 'ᴀᴍ'
    if (hrs >= 12 && hrs <= 24) am_pm = 'ᴘᴍ'
    let madeMenu = `👋 *HI*, *${pushname}*
  
╭─「 ᴅᴀᴛᴇ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ 」
│📅 *\`Date\`*: ${date}
│⏰ *\`Time\`*: ${time} ${am_pm}
╰──────────●●►

╭──────────●●►
│ *Hello , I am RAUF MD!!*
╰──────────●●►

${bot.COPYRIGHT}`

await conn.sendMessage(from, { 
    image:{ url:bot.ALIVE_IMG },
    caption:madeMenu,
    contextInfo
},{quoted:mek})
console.log(`♻ About Command Used : ${from}`);
}catch(e){
console.log(e)
reply(`${e}`)
}
})
//==================================================ALive============================================
cmd(
    {
      pattern: "alive",
      alias: ["status"],
      desc: "Check if the bot is alive",
      category: "main",
      react: "👨‍💻",
      filename: __filename,
    },
    async (conn,mek,m, { from, pushname, reply, contextInfo } ) => {
      try {
    
      var time = new Date().toLocaleString('HI', { timeZone: 'Asia/Colombo' }).split(' ')[1]
      var date = new Date().toLocaleDateString(get_localized_date)
      var am_pm = ''
        if (hrs < 12) am_pm = 'ᴀᴍ'
        if (hrs >= 12 && hrs <= 24) am_pm = 'ᴘᴍ'
        
let aliveText =`👋 *HI*, *${pushname}* *I Am Alive Now*
  
╭─「 ᴅᴀᴛᴇ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ 」
│📅 *\`Date\`*: ${date}
│⏰ *\`Time\`*: ${time} ${am_pm}
╰──────────●●►
  
╭─「 ꜱᴛᴀᴛᴜꜱ ᴅᴇᴛᴀɪʟꜱ 」
│👤 *\`User\`*: ${pushname}
│✒ *\`Prefix\`*: ${config.PREFIX}
│🧬 *\`Version\`*: ${bot.VERSION}
│📟 *\`Uptime\`*: ${runtime(process.uptime())}
│📂 *\`Memory\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
╰──────────●●►
╭──────────●●►
│ *Hello , I am alive now!!*
╰──────────●●►
  
🔢 *Reply below number*
  
1 │❯❯◦ COMMANDS MENU
2 │❯❯◦ RAUF-MD SPEED
  
${bot.COPYRIGHT}`;

const vv = await conn.sendMessage( from, { 
    image: { url:bot.ALIVE_IMG },
    caption:aliveText,
    contextInfo
},{quoted:mek})
conn.ev.on('messages.upsert', async (msgUpdate) => {
          const msg = msgUpdate.messages[0];
          if (!msg.message || !msg.message.extendedTextMessage) return;
  
          const selectedOption = msg.message.extendedTextMessage.text.trim();
  
          if (msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.stanzaId === vv.key.id) {
              switch (selectedOption) {
                  case '1':
                      reply('.menu');
                      break;
                  case '2':
                      reply('.ping');
                      break;
                      default:
                          reply("Invalid option. Please select a valid option🔴");
                  }
  
              }
          });
  
        console.log(`♻ Alive command used in: ${from}`);
      } catch (e) {
        console.error("Alive Command Error:", e);
        reply(`❌ Error: ${e.message}`);
      }
    }
  );
//=============================================Auto Bio===============================================
// AutoBIO feature variables
let autoBioInterval;

// 1. Set AutoBIO
cmd({
    on: "body"
  },  
 async (conn, mek, m, { from, isOwner, reply }) => {
    if (config.AUTO_BIO === 'true') {
        startAutoBio(conn);
    } 
});

// 2. Start AutoBIO
function startAutoBio(conn) {
    // Clear any existing interval to avoid duplicates
    if (autoBioInterval) clearInterval(autoBioInterval);

    // Set a new interval to update the bio every minute (or any preferred time)
    autoBioInterval = setInterval(async () => {
        const bioText = `*${bot.BIO_TEXT}* ${runtime(process.uptime())} 💛`;  // Set the bio text with time
        await conn.updateProfileStatus(bioText);  // Update the bot's bio
    }, 60 * 1000);  // 1 minute interval
}
console.log(`RAUF-MD ♻ Auto Bio Started`);
//============================ Env=======================================================
function isEnabled(value) {
return value && value.toString().toLowerCase() === "true";
}
cmd({
    pattern: "env",
    alias: ["setting2", "allvar"],
    desc: "Settings of bot",
    category: "main",
    react: "⤵️",
    filename: __filename
}, 
async (conn, mek, m, { from, contextInfo, reply }) => {
    try {
        // Define the settings message with the correct boolean checks
        let envSettings = `╭━━━〔 *RAUF-MD-ENV* 〕━━━┈⊷
┃▸╭───────────
┃▸┃๏ *𝔼ℕ𝕍 𝕊𝔼𝕋𝕋𝕀ℕ𝔾𝕊 📡*
┃▸└───────────···๏
╰────────────────┈⊷
╭━━〔 *Enabled Disabled* 〕━━┈⊷
┇๏ *Status View:* ${isEnabled(config.AUTO_READ_STATUS) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Status Reply:* ${isEnabled(config.AUTO_STATUS_REPLY) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto Reply:* ${isEnabled(config.AUTO_REPLY) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto Sticker:* ${isEnabled(config.AUTO_STICKER) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto Voice:* ${isEnabled(config.AUTO_VOICE) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto React:* ${isEnabled(config.AUTO_REACT) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Anti-Link:* ${isEnabled(config.ANTI_LINK) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Anti-Bad Words:* ${isEnabled(config.ANTI_BAD) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto Typing:* ${isEnabled(config.AUTO_TYPING) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Auto Recording:* ${isEnabled(config.AUTO_RECORDING) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Always Online:* ${isEnabled(config.ALWAYS_ONLINE) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Public Mode:* ${isEnabled(config.PUBLIC_MODE) ? "Enabled ✅" : "Disabled ❌"}
┇๏ *Read Message:* ${isEnabled(config.READ_CMD) ? "Enabled ✅" : "Disabled ❌"}
╰━━━━━━━━━━━━──┈⊷
> ${bot.DESCRIPTION}`;

        // Send message with an image
        await conn.sendMessage(
            from,
            {
                image: { url: `${bot.ALIVE_IMG}` }, // Image URL
                caption: envSettings,
                contextInfo
            },
            { quoted: mek }
        );

        // Send an audio file
        console.log(`♻ ENV Command Used : ${from}`);
    } catch (error) {
        console.log(error);
        reply(`Error: ${error.message}`);
    }
});
//============================List===========================================
cmd({
    pattern: "list",
    react: "🛸",
    alias: ["panel","list","commands"],
    desc: "Get bot\'s command list.",
    category: "main",
    use: '.list',
    filename: __filename
},
async(conn, mek, m,{ from, pushname, reply, contextInfo, qMessage }) => {
try{
let menu = {
main: '',
ai: '',
download: '',
group: '',
owner: '',
convert: '',
education: '',
news: '',
movie: '',
search: '',
tools: '',
other: '',
fun: ''
};

for (let i = 0; i < commands.length; i++) {
if (commands[i].pattern && !commands[i].dontAddCommandList) {
menu[commands[i].category] += `*│*❯❯◦ ${commands[i].pattern}\n`;
 }
}

let madeMenu = `🤩 *HELLOW* *${pushname}*
> WELLCOME TO RAUF-MD 🪀

╭─「 ꜱᴛᴀᴛᴜꜱ ᴅᴇᴛᴀɪʟꜱ 」
│👤 *\`User\`*: ${pushname}
│✒ *\`Prefix\`*: ${config.PREFIX}
│🧬 *\`Version\`*: ${bot.VERSION}
│📟 *\`Uptime\`*: ${runtime(process.uptime())}
│📂 *\`Memory\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
╰──────────●●►

> OWNER COMMANDS
*╭──────────●●►*
${menu.owner}*╰───────────●●►*
> CONVERT COMMANDS
*╭──────────●●►*
${menu.convert}*╰───────────●●►*
> AI COMMANDS
*╭──────────●●►*
${menu.ai}*╰───────────●●►*
> SEARCH COMMANDS
*╭──────────●●►*
${menu.search}*╰───────────●●►*
> DOWNLOAD COMMANDS
*╭──────────●●►*
${menu.download}*╰───────────●●►*
> MAIN COMMANDS
*╭──────────●●►*
${menu.main}*╰───────────●●►*
> GROUP COMMANDS
*╭──────────●●►*
${menu.group}*╰───────────●●►*
> FUN COMMANDS
*╭──────────●●►*
${menu.fun}*╰───────────●●►*
> TOOLS COMMANDS
*╭──────────●●►*
${menu.tools}*╰───────────●●►*
> OTHER COMMANDS
*╭──────────●●►*
${menu.other}*╰───────────●●►*
> MOVIE COMMANDS
*╭──────────●●►*
${menu.movie}*╰───────────●●►*
> NEWS COMMANDS
*╭──────────●●►*
${menu.news}*╰───────────●●►*
> PAST PAPER COMMANDS
*╭──────────●●►*
${menu.education}*╰───────────●●►*

${bot.COPYRIGHT}`
console.log(`♻ List Command Used : ${from}`);
await conn.sendMessage( from, 
    {
        image:{ url:bot.ALIVE_IMG },
        caption: madeMenu,
        contextInfo
    }, { quoted: qMessage })
}catch(e){
console.log(e)
reply(`${e}`)
}
})
//=================================menu=====================================================================
cmd({
    pattern: "menu",
    alias: ["help"],
    desc: "Displays the bot menu",
    react: "📜",
    category: "main"
},
async (conn, mek, m, { from, pushname, reply, contextInfo }) => {
    try {
        let desc = `
🤩 *HELLOW* *${pushname}*
> WELLCOME TO RAUF-MD 🪀

╭─「 ꜱᴛᴀᴛᴜꜱ ᴅᴇᴛᴀɪʟꜱ 」
│👤 *\`User\`*: ${pushname}
│✒ *\`Prefix\`*: ${config.PREFIX}
│🧬 *\`Version\`*: ${bot.VERSION}
│📟 *\`Uptime\`*: ${runtime(process.uptime())}
│📂 *\`Memory\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
╰──────────●●►

> ʀᴇᴘʟʏ ᴛʜᴇ ɴᴜᴍʙᴇʀ ʙᴇʟᴏᴡ🗿

¹  │❯❯◦ OWNER MENU
²  │❯❯◦ CONVERT MENU
³  │❯❯◦ AI MENU
⁴  │❯❯◦ SEARCH MENU
⁵  │❯❯◦ DOWNLOAD MENU
⁶  │❯❯◦ MAIN MENU
⁷  │❯❯◦ GROUP MENU
⁸  │❯❯◦ FUN MENU
⁹  │❯❯◦ TOOLS MENU
¹⁰ │❯❯◦ OTHER MENU
¹¹ │❯❯◦ MOVIE MENU
¹² │❯❯◦ NEWS MENU
¹³ │❯❯◦ EDUCATION MENU 

${bot.COPYRIGHT}`;

        // Send the menu with an image
        const menuMessage = await conn.sendMessage(from, { 
            image: { url: bot.ALIVE_IMG }, 
            caption: desc, 
            contextInfo
        }, { quoted: mek });

        // Listen for the reply
        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg.message || !msg.message.extendedTextMessage) return;
            
            const selectedOption = msg.message.extendedTextMessage.text.trim();

            // Check if the reply is in response to the menu message
            if (msg.message.extendedTextMessage.contextInfo?.stanzaId === menuMessage.key.id) {

                switch (selectedOption) {
                    case '1':
                        {
                            const ownerCommands = commands.filter(c => c.category === 'owner' && !c.dontAddCommandList);
                            const commandList = ownerCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response = `*◈ OWNER COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${ownerCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.OWNER_IMG }, 
                            caption: response 
                        }, { quoted: mek });
                        }
                        break;
                    case '2':
                        {
                            const convertCommands = commands.filter(c => c.category === 'convert' && !c.dontAddCommandList);
                            const commandList = convertCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response2 = `*◈ CONVERT COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${convertCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.CONVERT_IMG }, 
                            caption: response2 
                        }, { quoted: mek });
                        }
                        break;
                    case '3':
                        {
                            const aiCommands = commands.filter(c => c.category === 'ai' && !c.dontAddCommandList);
                            const commandList = aiCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response3 = `*◈ AI COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${aiCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.AI_IMG }, 
                            caption: response3 
                        }, { quoted: mek });
                        }
                        break;
                    case '4':
                        {
                            const searchCommands = commands.filter(c => c.category === 'search' && !c.dontAddCommandList);
                            const commandList = searchCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response4 = `*◈ SEARCH COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${searchCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.SEARCH_IMG }, 
                            caption: response4 
                        }, { quoted: mek });
                        }
                        break;
                    case '5':
                        {
                            const downloadCommands = commands.filter(c => c.category === 'download' && !c.dontAddCommandList);
                            const commandList = downloadCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response5 = `*◈ DOWNLOAD COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${downloadCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.DOWNLOAD_IMG }, 
                            caption: response5 
                        }, { quoted: mek });
                        }
                        break;
                    case '6':
                        {
                            const mainCommands = commands.filter(c => c.category === 'main' && !c.dontAddCommandList);
                            const commandList = mainCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response6 = `*◈ MAIN COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${mainCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.MAIN_IMG }, 
                            caption: response6 
                        }, { quoted: mek });
                        }
                        break;
                    case '7':
                        {
                            const groupCommands = commands.filter(c => c.category === 'group' && !c.dontAddCommandList);
                            const commandList = groupCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response7 = `*◈ GROUP COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${groupCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.GROUP_IMG }, 
                            caption: response7 
                        }, { quoted: mek });
                        }
                        break;
                    case '8':
                        {
                            const funCommands = commands.filter(c => c.category === 'fun' && !c.dontAddCommandList);
                            const commandList = funCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response8 = `*◈ FUN COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${funCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.FUN_IMG }, 
                            caption: response8 
                        }, { quoted: mek });
                        }
                        break;
                    case '9':
                        {
                            const toolsCommands = commands.filter(c => c.category === 'tools' && !c.dontAddCommandList);
                            const commandList = toolsCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response9 = `*◈ TOOLS COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${toolsCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.TOOLS_IMG }, 
                            caption: response9 
                        }, { quoted: mek });
                        }
                        break;
                    case '10':
                        {
                            const otherCommands = commands.filter(c => c.category === 'other' && !c.dontAddCommandList);
                            const commandList = otherCommands.map(c => `│ • *${c.pattern}*`).join('\n');
                            const response10 = `*◈ OTHER COMMAND LIST ◈*
╭─「 ᴄᴏᴍᴍᴀɴᴅꜱ ᴘᴀɴᴇʟ」
│◈ *RAM USAGE* - ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◈ *RUN TIME* - ${runtime(process.uptime())}
╰──────────●●►
╭────────●●►
${commandList}
╰────────●●►
➠ *Total Commands: ${otherCommands.length}*
${bot.COPYRIGHT}`;
                        await conn.sendMessage(from, { 
                            image: { url: bot.OTHER_IMG }, 
                            caption: response10 
               
