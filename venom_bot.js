const venom = require('venom-bot');
const axios = require('axios');

// URL da API da Akira (Servidor ou Local)
const AKIRA_API_URL = process.env.AKIRA_API_URL || 'https://amazing-ant-softedge-998ba377.koyeb.app/bot';

// Caminho do Chrome (para Render/Koyeb)
const CHROME_PATH = process.env.CHROME_EXECUTABLE_PATH || "/usr/bin/google-chrome";

venom
  .create({
    session: "bot",
    headless: true,
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--no-zygote",
      "--disable-gpu",
      "--user-data-dir=/tmp",
      "--remote-debugging-port=9222",
      "--disable-software-rasterizer",
      "--disable-dev-shm-usage",
      "--window-size=1920x1080",
      "--disable-features=site-per-process",
      "--enable-features=NetworkService,NetworkServiceInProcess",
      "--disable-breakpad",
      "--disable-sync",
      "--disable-translate",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-ipc-flooding-protection",
      "--disable-client-side-phishing-detection",
      "--mute-audio",
      "--disable-default-apps",
      "--disable-popup-blocking",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost"
    ],
    browserPath: CHROME_PATH
  })
  .then(client => start(client))
  .catch(error => {
    console.error("[ERRO] Falha ao iniciar o Venom-Bot:", error);
    console.log("Tentando reiniciar em 5 segundos...");
    setTimeout(() => process.exit(), 5000);
  });

async function start(client) {
  console.log("✅ Akira está online!");

  let botNumber;
  try {
    const botInfo = await client.getHostDevice();
    botNumber = botInfo.id ? botInfo.id._serialized.split("@")[0] : null;

    if (!botNumber) {
      throw new Error("Número do bot não encontrado!");
    }

    console.log("📞 Número do bot:", botNumber);
  } catch (err) {
    console.error("⚠️ Erro ao obter número do bot:", err);
    return;
  }

  client.onStateChange((state) => {
    console.log("[INFO] Estado do WhatsApp:", state);
    if (["CONFLICT", "UNLAUNCHED", "UNPAIRED", "UNPAIRED_IDLE"].includes(state)) {
      console.log("⚠️ Sessão desconectada! Tentando reconectar...");
      client.useHere();
    }
  });

  client.onStreamChange((state) => {
    console.log("[INFO] Status do Stream:", state);
    if (state === "DISCONNECTED") {
      console.log("❌ Conexão perdida! Reiniciando em 5 segundos...");
      setTimeout(() => start(client), 5000);
    }
  });

  client.onMessage(async (message) => {
    const isGroup = message.isGroupMsg;
    const mentionedAkira = message.body.toLowerCase().includes('akira');
    const isMentioned = message.mentionedJidList.length > 0;
    const senderName = message.sender?.pushname || message.sender?.verifiedName || "Usuário";
    const senderNumber = message.sender?.id.split("@")[0] || null;

    const mentionedAkiraWithAt = isMentioned && message.mentionedJidList.some(jid => jid.includes(botNumber));
    const isReply = message.quotedMsg !== undefined && message.quotedMsg !== null;
    const quotedAuthor = message.quotedMsg?.author || message.quotedParticipant;
    const isReplyToAkira = isReply && quotedAuthor && quotedAuthor.includes(botNumber);

    if (isGroup) {
      if (!mentionedAkiraWithAt && !mentionedAkira && !isReplyToAkira) {
        return;
      }
    }

    try {
      const response = await axios.post(AKIRA_API_URL, {
        message: message.body,
        sender: senderName,
        numero: senderNumber
      });

      const botReply = response.data?.reply || "⚠️ Erro ao obter resposta da Akira.";
      await client.sendText(message.from, botReply);
    } catch (error) {
      console.error("[ERRO] Falha ao chamar a API do bot:", error);
      await client.sendText(message.from, "⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    }
  });
}
