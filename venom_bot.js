const venom = require('venom-bot');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 6000;

// ✅ URL da API da Akira (Servidor ou Local)
const AKIRA_API_URL = process.env.AKIRA_API_URL || 'https://amazing-ant-softedge-998ba377.koyeb.app/bot';

// ✅ Inicia o Venom-Bot
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
    ]
  })
  .then(client => start(client))
  .catch(error => {
    console.error("❌ Erro ao iniciar o Venom-Bot:", error);
    console.log("🔄 Tentando reiniciar em 5 segundos...");
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

  // ✅ Monitora estado do WhatsApp
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

  // ✅ Processa mensagens recebidas
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

    // ✅ Responde apenas quando necessário
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
      console.error("❌ Erro ao chamar a API da Akira:", error);
      await client.sendText(message.from, "⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    }
  });
}

// ✅ Adiciona um servidor HTTP para evitar erro de porta no Render/Koyeb
app.get('/', (req, res) => {
  res.send("✅ Venom-Bot está rodando!");
});

// Endpoint de health check para evitar erro de porta
app.get('/healthz', (req, res) => {
  res.sendStatus(200);
});

// Inicia o servidor Express
app.listen(PORT, () => {
  console.log(`🔵 Servidor HTTP rodando na porta ${PORT}`);
});
