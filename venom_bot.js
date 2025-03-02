const venom = require('venom-bot');
const axios = require('axios');

venom
  .create({
    session: 'bot-session',
    multidevice: true,
    headless: true, // Mantém rodando sem interface gráfica
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  })
  .then(client => start(client))
  .catch(error => {
    console.error("[ERRO] Falha ao iniciar o Venom-Bot:", error);
    console.log("Tentando reiniciar em 5 segundos...");
    setTimeout(() => process.exit(), 5000); // Reinicia o processo
  });

async function start(client) {
  console.log("✅ Akira está online!");

  let botNumber;
  try {
    const botInfo = await client.getHostDevice(); // Obtém informações do dispositivo
    botNumber = botInfo.id ? botInfo.id._serialized.split("@")[0] : null;

    if (!botNumber) {
      throw new Error("Número do bot não encontrado!");
    }

    console.log("📞 Número do bot:", botNumber);
  } catch (err) {
    console.error("⚠️ Erro ao obter número do bot:", err);
    return;
  }

  // Monitorar status da sessão e tentar reconectar se cair
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
    const isGroup = message.isGroupMsg; // Se for um grupo
    const mentionedAkira = message.body.toLowerCase().includes('akira'); // Nome "akira" no texto
    const isMentioned = message.mentionedJidList.length > 0; // Se alguém foi mencionado com @
    const senderName = message.sender?.pushname || message.sender?.verifiedName || "Usuário";

    // Verifica se a Akira foi mencionada com @
    const mentionedAkiraWithAt = isMentioned && message.mentionedJidList.some(jid => jid.includes(botNumber));

    // Verifica se a mensagem é uma resposta direta para a Akira
    const isReply = message.quotedMsg !== undefined && message.quotedMsg !== null;
    const quotedAuthor = message.quotedMsg?.author || message.quotedParticipant;
    const isReplyToAkira = isReply && quotedAuthor && quotedAuthor.includes(botNumber);

    // 🔹 REGRAS PARA GRUPOS
    if (isGroup) {
      // A Akira só responde se:
      // - For mencionada com @ (mentionedAkiraWithAt)
      // - Se o nome "akira" aparecer no texto (mentionedAkira)
      // - Se a mensagem for uma resposta direta a uma mensagem dela (isReplyToAkira)
      if (!mentionedAkiraWithAt && !mentionedAkira && !isReplyToAkira) {
        return; // Se nenhuma dessas condições for atendida, não responde
      }
    }

    // 🔹 EM CHAT PRIVADO, RESPONDE A TUDO SEM FILTRO

    try {
      const response = await axios.post('http://127.0.0.1:6000/bot', {
        message: message.body,
        sender: senderName
      });

      const botReply = response.data?.reply || "⚠️ Erro ao obter resposta da Akira.";
      await client.sendText(message.from, botReply);
    } catch (error) {
      console.error("[ERRO] Falha ao chamar a API do bot:", error);
      await client.sendText(message.from, "Erro ao processar sua mensagem.");
    }
  });
}
