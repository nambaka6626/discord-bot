const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

// ⚙️ CONFIG
const TARGET_CHANNEL_ID = '1222964513557713060'; // room AFK
const EXCLUDED_ROLE_ID = '1495699084877758567'; // role miễn
const LOG_CHANNEL_ID = '1209575970177028098'; // ⚠️ thay bằng kênh chat của bạn
const AFK_TIME = 36 * 60 * 1000; // 5 phút test

const lastActive = new Map();

client.on('clientReady', async () => {
  console.log(`Bot đã online: ${client.user.tag}`);

  // Load toàn bộ member
  client.guilds.cache.forEach(async (guild) => {
    await guild.members.fetch();
    console.log(`Loaded members: ${guild.name}`);
  });

  // Check AFK mỗi 1 phút
  setInterval(checkAFK, 60 * 1000);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const member = newState.member;
  if (!member || member.user.bot) return;

  // Rời voice
  if (!newState.channel) {
    lastActive.delete(member.id);
    return;
  }

  // Có role miễn → bỏ qua
  if (member.roles.cache.has(EXCLUDED_ROLE_ID)) return;

  // Join voice
  if (!oldState.channel && newState.channel) {
    lastActive.set(member.id, Date.now());
  }

  // Có hoạt động
  if (
    (oldState.selfMute && !newState.selfMute) ||
    (oldState.selfDeaf && !newState.selfDeaf)
  ) {
    lastActive.set(member.id, Date.now());
  }
});

async function checkAFK() {
  const now = Date.now();

  client.guilds.cache.forEach((guild) => {
    guild.members.cache.forEach(async (member) => {
      if (!member.voice.channel) return;
      if (member.user.bot) return;
      if (member.roles.cache.has(EXCLUDED_ROLE_ID)) return;

      const last = lastActive.get(member.id);
      if (!last) return;

      if (now - last > AFK_TIME) {
        try {
          // 🔹 Kéo sang room AFK
          await member.voice.setChannel(TARGET_CHANNEL_ID);

          console.log(`Moved AFK: ${member.user.tag}`);

          // 🔹 Gửi thông báo
          const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

          if (channel) {
            const minutes = AFK_TIME / 60000;

            channel.send(
              `Cục trôi sông, hận đời lông bông\nBro ${member} chết trôi sông vì đã afk ${minutes} phút, hẹ hẹ~`
            );
          }

          // reset tránh spam
          lastActive.set(member.id, now);

        } catch (err) {
          console.error(`Lỗi move ${member.user.tag}:`, err.message);
        }
      }
    });
  });
}

client.login('process.env.TOKEN');
