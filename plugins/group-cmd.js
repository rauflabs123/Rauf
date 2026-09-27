const { cmd, commands } = require('../lib/command');
const os = require('os')
const fs = require('fs')
const bot = require('../lib/bot')
//===============================User======================================
cmd({
    pattern: "user info",
    react: "👤",
    alias: ["user", "profile"],
    desc: "Get complete user profile information",
    category: "group",
    use: '.person [@tag or reply]',
    filename: __filename
},
async (conn, mek, m, { from, sender, isGroup, reply, quoted, participants }) => {
    try {
        // 1. DETERMINE TARGET USER
        let userJid = quoted?.sender || 
                     mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     sender;

        // 2. VERIFY USER EXISTS
        const [user] = await conn.onWhatsApp(userJid).catch(() => []);
        if (!user?.exists) return reply("❌ User not found on WhatsApp");

        // 3. GET PROFILE PICTURE
        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(userJid, 'image');
        } catch {
            ppUrl = 'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png';
        }

        // 4. GET NAME (MULTI-SOURCE FALLBACK)
        let userName = userJid.split('@')[0];
        try {
            // Try group participant info first
            if (isGroup) {
                const member = participants.find(p => p.id === userJid);
                if (member?.notify) userName = member.notify;
            }
            
            // Try contact DB
            if (userName === userJid.split('@')[0] && conn.contactDB) {
                const contact = await conn.contactDB.get(userJid).catch(() => null);
                if (contact?.name) userName = contact.name;
            }
            
            // Try presence as final fallback
            if (userName === userJid.split('@')[0]) {
                const presence = await conn.presenceSubscribe(userJid).catch(() => null);
                if (presence?.pushname) userName = presence.pushname;
            }
        } catch (e) {
            console.log("Name fetch error:", e);
        }

        // 5. GET BIO/ABOUT
        let bio = {};
        try {
            // Try personal status
            const statusData = await conn.fetchStatus(userJid).catch(() => null);
            if (statusData?.status) {
                bio = {
                    text: statusData.status,
                    type: "Personal",
                    updated: statusData.setAt ? new Date(statusData.setAt * 1000) : null
                };
            } else {
                // Try business profile
                const businessProfile = await conn.getBusinessProfile(userJid).catch(() => null);
                if (businessProfile?.description) {
                    bio = {
                        text: businessProfile.description,
                        type: "Business",
                        updated: null
                    };
                }
            }
        } catch (e) {
            console.log("Bio fetch error:", e);
        }

        // 6. GET GROUP ROLE
        let groupRole = "";
        if (isGroup) {
            const participant = participants.find(p => p.id === userJid);
            groupRole = participant?.admin ? "👑 Admin" : "👥 Member";
        }

        // 7. FORMAT OUTPUT
        const formattedBio = bio.text ? 
            `${bio.text}\n└─ 📌 ${bio.type} Bio${bio.updated ? ` | 🕒 ${bio.updated.toLocaleString()}` : ''}` : 
            "No bio available";

        const userInfo = `
*GC MEMBER INFORMATION 🧊*

📛 *Name:* ${userName}
🔢 *Number:* ${userJid.replace(/@.+/, '')}
📌 *Account Type:* ${user.isBusiness ? "💼 Business" : user.isEnterprise ? "🏢 Enterprise" : "👤 Personal"}

*📝 About:*
${formattedBio}

*⚙️ Account Info:*
✅ Registered: ${user.isUser ? "Yes" : "No"}
🛡️ Verified: ${user.verifiedName ? "✅ Verified" : "❌ Not verified"}
${isGroup ? `👥 *Group Role:* ${groupRole}` : ''}
`.trim();

        // 8. SEND RESULT
        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption: userInfo,
            mentions: [userJid]
        }, { quoted: mek });

    } catch (e) {
        console.error("Person command error:", e);
        reply(`❌ Error: ${e.message || "Failed to fetch profile"}`);
    }
});
//===============================Add A Member===============================
cmd({
    pattern: "add",
    alias: ["a", "invite"],
    desc: "Adds a member to the group",
    category: "admin",
    react: "➕",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, quoted, senderNumber
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Get the bot owner's number dynamically from conn.user.id
    /*const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }*/

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If manually typing a number with '@'
    } else if (q && /^\d+$/.test(q)) {
        number = q; // If directly typing a number
    } else {
        return reply("❌ Please reply to a message, mention a user, or provide a number to add.");
    }

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "add");
        reply(`✅ Successfully added @${number}`, { mentions: [jid] });
    } catch (error) {
        console.error("Add command error:", error);
        reply("❌ Failed to add the member.");
    }
});
//-----------------------------------------------Get Group Admins-----------------------------------------------
cmd({
    pattern: "admins",
    desc: "Get a list of group admins.",
    react: "👥",
    category: "group",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        const groupMetadata = await conn.groupMetadata(from);
        const admins = groupMetadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(admin => `@${admin.id.split('@')[0]}`)
            .join('\n');

        return await conn.sendMessage(from, {
            text: `*Group Admins:*\n\n${admins}`,
            mentions: groupMetadata.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(admin => admin.id)
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        return await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply(`Error: ${e.message}`);
    }
});

//------------------------------------------------------------Set Group Description--------------------------------------------------------------

cmd({
    pattern: "groupdesc",
    desc: "Change the group description.",
    use: '.groupdesc <New Description>',
    react: "👥",
    category: "group",
    filename: __filename
},
async (conn, mek, m, {
    from, args, quoted, body, isCmd, command, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!isAdmins) return reply(`You Must Be Admin For Use This Command`);
        if (args.length === 0) return reply('Please provide a new group description.');

        const newDesc = args.join(' '); // Join all arguments as the new description
        await conn.groupUpdateDescription(from, newDesc);

        return await conn.sendMessage(from, {
            text: `Group description has been updated to:\n\n${newDesc}`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        return await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply(`Error: ${e.message}`);
    }
});

//-----------------------------------------------------------Get Group Info-------------------------------------------------------------

cmd({
    pattern: "groupinfo",
    desc: "Get information about the group.",
    react: "👥",
    category: "group",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        const groupMetadata = await conn.groupMetadata(from); // Get group metadata
        const groupInfo = `
*Group Name:* ${groupMetadata.subject}
*Group Description:* ${groupMetadata.desc || 'No description'}
*Members:* ${groupMetadata.participants.length}
*Created At:* ${new Date(groupMetadata.creation * 1000).toLocaleString()}
        `;
        return await conn.sendMessage(from, {
            text: groupInfo
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        return await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply(`Error: ${e.message}`);
    }
});

//-----------------------------------------------Get Group Invite Link-----------------------------------------------

cmd({
    pattern: "grouplink",
    desc: "Get the group's invite link.",
    react: "👥",
    category: "group",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        const inviteLink = await conn.groupInviteCode(from);
        return await conn.sendMessage(from, {
            text: `*Here is your group's invite link:* https://chat.whatsapp.com/${inviteLink}`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        return await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply(`Error: ${e.message}`);
    }
});

//-----------------------------------------------Group Name Change-----------------------------------------------

cmd({
    pattern: "gname",
    desc: "Change the group name",
    use: ".gname <New Group Name>",
    react: "✏️",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, sender, groupMetadata, args, reply }) => {
    if (!isGroup) {
        return await reply("This command can only be used in groups.");
    }
    const botNumber = conn.user.jid;
    const isBotAdmin = groupMetadata.participants.some(participant => participant.jid === botNumber && participant.admin);
    
    if (!isBotAdmin) {
        return await reply("I'm not an admin in this group.");
    }
    const newName = args.join(" ");
    if (!newName) {
        return await reply("Please provide a new group name.");
    }
    try {
        await conn.groupUpdateSubject(from, newName);
        return await reply(`Group name changed to "${newName}" successfully!`);
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } })
    } catch (error) {
        console.error('Error changing group name:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        return await reply("Failed to change the group name. Please try again later.");
    }
});


//---------------------------------------------Group Subject Change --------------------------------------------

cmd({
    pattern: "setsubject",
    desc: "Change the group subject.",
    use: '.setsubject <New Subject>',
    react: "👥",
    category: "group",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!isAdmins) return reply(`You Must Be Admin For Use This Command`);
        if (args.length === 0) return await conn.sendMessage(from, {
            text: 'Please provide a new group subject.'
        }, { quoted: mek });

        const newSubject = args.join(' '); // Join all arguments as the new subject
        await conn.groupUpdateSubject(from, newSubject);

        return await conn.sendMessage(from, {
            text: `Group subject has been updated to: ${newSubject}`
        }, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } })

    } catch (e) {
        console.log(e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        reply(`Error: ${e.message}`);
    }
});


//---------------------------------------------REQUEST --------------------------------------------
// Command to view pending join requests
cmd({
    pattern: "requests",
    desc: "View pending join requests",
    use: ".requests",
    react: "📝",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) {
        return await reply("This command can only be used in groups.");
    }
    const botNumber = conn.user.jid;
    const groupMetadata = await conn.groupMetadata(from);
    const isBotAdmin = groupMetadata.participants.some(participant => participant.jid === botNumber && participant.admin);

    if (!isBotAdmin) {
        return await reply("I'm not an admin in this group.");
    }

    try {
        const requests = await conn.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            return await reply("No pending join requests.");
        }

        let msg = "Pending Join Requests:\n\n";
        requests.forEach((request, index) => {
            msg += `${index + 1}. @${request.jid.split("@")[0]}\n`;
        });
        return await reply(msg, { mentions: requests.map(r => r.jid) });
    } catch (error) {
        console.error('Error retrieving join requests:', error);
        return await reply("Failed to retrieve join requests. Please try again later.");
    }
});

// Command to accept group join requests
cmd({
    pattern: "accept",
    desc: "Accept group join request(s)",
    use: ".accept <request numbers>",
    react: "✔️",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply, match }) => {
    // Check if the command is being used in a group
    if (!isGroup) {
        return await reply("This command can only be used in groups.");
    }
    const botNumber = conn.user.jid;
    const groupMetadata = await conn.groupMetadata(from);
    const isBotAdmin = groupMetadata.participants.some(participant => participant.jid === botNumber && participant.admin);

    if (!isBotAdmin) {
        return await reply("_I'm not an admin in this group._");
    }
    try {
        const requests = await conn.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            return await reply("No pending join requests.");
        }
        if (!match) {
            return await reply("_Provide the number(s) of the request(s) to accept, separated by commas._");
        }
        const indexes = match.split(",").map(num => parseInt(num.trim()) - 1);
        const validIndexes = indexes.filter(index => index >= 0 && index < requests.length);
        if (validIndexes.length === 0) {
            return await reply("_Invalid request number(s)._");
        }
        for (let index of validIndexes) {
            await conn.groupRequestParticipantsUpdate(from, [requests[index].jid], "accept");
        }
        return await reply(`_Accepted ${validIndexes.length} join request(s)._`);
    } catch (error) {
        console.error('Error accepting join requests:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        return await reply("Failed to accept join requests. Please try again later.");
    }
});

// Command to reject group join requests
cmd({
    pattern: "reject",
    desc: "Reject group join request(s)",
    use: ".reject <request numbers>",
    react: "❌",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply, match }) => {
    if (!isGroup) {
        return await reply("This command can only be used in groups.");
    }
    const botNumber = conn.user.jid;
    const groupMetadata = await conn.groupMetadata(from);
    const isBotAdmin = groupMetadata.participants.some(participant => participant.jid === botNumber && participant.admin);

    if (!isBotAdmin) {
        return await reply("I'm not an admin in this group.");
    }

    try {
        const requests = await conn.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            return await reply("No pending join requests.");
        }
        if (!match) {
            return await reply("Provide the number(s) of the request(s) to reject, separated by commas.");
        }

        const indexes = match.split(",").map(num => parseInt(num.trim()) - 1);
        const validIndexes = indexes.filter(index => index >= 0 && index < requests.length);

        if (validIndexes.length === 0) {
            return await reply("_Invalid request number(s)._");
        }
        for (let index of validIndexes) {
            await conn.groupRequestParticipantsUpdate(from, [requests[index].jid], "reject");
        }

        return await reply(`_Rejected ${validIndexes.length} join request(s)._`);
    } catch (error) {
        console.error('Error rejecting join requests:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
        return await reply("Failed to reject join requests. Please try again later.");
    }
});



//---------------------------------------------Hide Tag --------------------------------------------

cmd({
    pattern: "hidetag",
    desc: "Tags everyperson of group without mentioning their numbers",
    react: "👥",
    category: "group",
    filename: __filename,
    use: '<text>',
},
(conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
try { 
    if (!m.isGroup) return reply(tlang().group);
if (!m.isGroup) return reply('only for groups');
if (!isAdmins) return reply(`You Must Be Admin For Use This Command`);
    conn.sendMessage(m.chat, {
        text: q ? text : "",
        mentions: participants.map((a) => a.id),
    }, {
        quoted: mek ,messageId:genMsgId() 
    });
} catch (e) {
reply('Error !!')
l(e)
}
})

//---------------------------------------------Kick --------------------------------------------

cmd({
    pattern: "kick",
    desc: "Kicks replied/quoted user from group.",
    react: "👥",
    category: "group",
    filename: __filename,
    use: '<quote|reply|number>',
},           
async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!m.isGroup) return reply('This command is only for groups.');
        if (!isBotAdmins) return reply(`I can't do that. Please make me a group admin.`);
        if (!isAdmins) return reply(`You must be an admin to use this command.`);
    
        const user = quoted ? quoted.sender : null;
        if (!user) return reply('Please reply to a user to kick them.');

        await conn.groupParticipantsUpdate(m.chat, [user], "remove")
