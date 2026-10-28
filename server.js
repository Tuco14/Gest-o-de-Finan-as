// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv2 from "dotenv";

// api/health.ts
function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `M\xE9todo ${req.method} n\xE3o permitido. Utilize GET.` });
  }
  return res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "FinControl Backend API"
  });
}

// api/chat.ts
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
function formatBRL(val) {
  return Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function extractPrice(text) {
  const patterns = [
    /R\$\s*([\d\.,]+)/i,
    /([\d\.,]+)\s*(?:reais|real)/i,
    /(?:custa|custando|por|valor\s*(?:de)?)\s*(?:R\$)?\s*([\d\.,]+)/i,
    /(\d+(?:[.,]\d{1,2})?)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\./g, "").replace(",", ".");
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}
function generateLocalFinancialAnalysis(userMessage, financialContext) {
  const availableBalance = Number(financialContext?.availableBalance || 0);
  const totalBalance = Number(financialContext?.totalBalance || availableBalance);
  const pendingExpense = Number(financialContext?.monthlyMetrics?.pendingExpense || 0);
  const totalExpense = Number(financialContext?.monthlyMetrics?.totalExpense || 0);
  const totalIncome = Number(financialContext?.monthlyMetrics?.totalIncome || 0);
  const paidIncome = Number(financialContext?.monthlyMetrics?.paidIncome || 0);
  const paidExpense = Number(financialContext?.monthlyMetrics?.paidExpense || 0);
  const currentMonth = financialContext?.currentMonth || "deste m\xEAs";
  const saldoLivre = Math.round((availableBalance - pendingExpense) * 100) / 100;
  const purchasePrice = extractPrice(userMessage);
  const lowerMsg = userMessage.toLowerCase();
  const isPurchaseQuery = purchasePrice !== null && (lowerMsg.includes("posso") || lowerMsg.includes("comprar") || lowerMsg.includes("gastar") || lowerMsg.includes("vale") || lowerMsg.includes("d\xE1 pra") || lowerMsg.includes("da pra") || lowerMsg.includes("cabe") || lowerMsg.includes("reais"));
  if (isPurchaseQuery && purchasePrice !== null) {
    const sobraAposCompra = Math.round((saldoLivre - purchasePrice) * 100) / 100;
    if (purchasePrice <= saldoLivre * 0.7 && saldoLivre > 0) {
      return `Sim, \xE9 poss\xEDvel realizar essa compra de **R$ ${formatBRL(purchasePrice)}** com tranquilidade.

Sua situa\xE7\xE3o financeira atual permite essa aquisi\xE7\xE3o sem comprometer suas obriga\xE7\xF5es programadas:

* **Saldo Dispon\xEDvel (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do M\xEAs:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor da Compra:** R$ ${formatBRL(purchasePrice)}
* **Sobra Estimada Ap\xF3s a Compra:** **R$ ${formatBRL(sobraAposCompra)}**

Essa compra compromete menos de 70% do seu saldo livre atual, preservando uma margem segura para imprevistos.`;
    } else if (purchasePrice <= saldoLivre && saldoLivre > 0) {
      return `\xC9 poss\xEDvel realizar a compra de **R$ ${formatBRL(purchasePrice)}**, mas com ressalvas.

Confira os dados do seu fluxo de caixa:

* **Saldo Dispon\xEDvel (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do M\xEAs:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor da Compra:** R$ ${formatBRL(purchasePrice)}
* **Sobra Restante:** **R$ ${formatBRL(sobraAposCompra)}**

Ap\xF3s essa compra, restar\xE1 uma margem estreita para cobrir eventuais imprevistos at\xE9 o encerramento do m\xEAs.`;
    } else {
      const deficit = Math.abs(Math.round((purchasePrice - saldoLivre) * 100) / 100);
      return `N\xE3o \xE9 recomend\xE1vel realizar a compra de **R$ ${formatBRL(purchasePrice)}** agora.

O valor excede a sua folga real de caixa ap\xF3s descontar as contas pendentes:

* **Saldo Dispon\xEDvel (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do M\xEAs:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor Necess\xE1rio:** R$ ${formatBRL(purchasePrice)}
* **D\xE9ficit:** **R$ ${formatBRL(deficit)}**

Recomendamos aguardar o recebimento de novas receitas ou a quita\xE7\xE3o das despesas pendentes priorit\xE1rias antes de realizar esse gasto.`;
    }
  }
  if (lowerMsg.includes("saldo") || lowerMsg.includes("resumo") || lowerMsg.includes("m\xEAs") || lowerMsg.includes("mes") || lowerMsg.includes("contas")) {
    return `Aqui est\xE1 o panorama financeiro de **${currentMonth}**:

* **Saldo Dispon\xEDvel (Conta Principal):** **R$ ${formatBRL(availableBalance)}**
* **Saldo Total em Contas:** R$ ${formatBRL(totalBalance)}
* **Receitas do M\xEAs:** R$ ${formatBRL(totalIncome)} (Recebido: R$ ${formatBRL(paidIncome)} | Pendente: R$ ${formatBRL(financialContext?.monthlyMetrics?.pendingIncome || 0)})
* **Despesas do M\xEAs:** R$ ${formatBRL(totalExpense)} (Pago: R$ ${formatBRL(paidExpense)} | Pendente: R$ ${formatBRL(pendingExpense)})
* **Folga Livre de Caixa:** **R$ ${formatBRL(saldoLivre)}**

Voc\xEA pode me perguntar se cabe uma despesa espec\xEDfica no seu or\xE7amento ou tirar d\xFAvidas sobre suas contas a pagar.`;
  }
  return `Ol\xE1. Sou o FinBot AI, o consultor financeiro integrado ao FinControl.

Seus dados financeiros est\xE3o conectados em tempo real:

* **Saldo Dispon\xEDvel:** R$ ${formatBRL(availableBalance)}
* **Despesas Pendentes:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**

Voc\xEA pode me fazer perguntas pr\xE1ticas como:
- *"Posso comprar um item de R$ 250 agora?"*
- *"Como est\xE1 meu m\xEAs financeiro?"*
- *"Quanto ainda tenho que pagar de contas?"*

Como posso orientar voc\xEA hoje?`;
}
async function handler2(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `M\xE9todo ${req.method} n\xE3o permitido. Utilize POST.` });
  }
  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { messages, financialContext } = body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Lista de mensagens inv\xE1lida ou vazia." });
    }
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("[FinControl AI] Nenhuma chave Gemini detectada. Utilizando an\xE1lise financeira local.");
      const reply2 = generateLocalFinancialAnalysis(lastUserMessage, financialContext);
      return res.status(200).json({ reply: reply2 });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    let contextSummary = "Nenhum dado financeiro espec\xEDfico informado.";
    if (financialContext) {
      contextSummary = `
- Saldo Dispon\xEDvel (Conta Principal): R$ ${Number(financialContext.availableBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Contas e Carteiras (Total de saldos): R$ ${Number(financialContext.totalBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Detalhes das Contas: ${JSON.stringify(financialContext.accounts || [], null, 2)}
- M\xEAs de Refer\xEAncia: ${financialContext.currentMonth || "M\xEAs atual"}
- Receitas do M\xEAs: Total R$ ${Number(financialContext.monthlyMetrics?.totalIncome || 0).toFixed(2)} (Recebido: R$ ${Number(financialContext.monthlyMetrics?.paidIncome || 0).toFixed(2)}, Pendente: R$ ${Number(financialContext.monthlyMetrics?.pendingIncome || 0).toFixed(2)})
- Despesas do M\xEAs: Total R$ ${Number(financialContext.monthlyMetrics?.totalExpense || 0).toFixed(2)} (Pago: R$ ${Number(financialContext.monthlyMetrics?.paidExpense || 0).toFixed(2)}, Pendente: R$ ${Number(financialContext.monthlyMetrics?.pendingExpense || 0).toFixed(2)})
- Contas a Pagar / Parcelas Cadastradas:
${JSON.stringify(financialContext.bills || [], null, 2)}
- Metas Financeiras:
${JSON.stringify(financialContext.goals || [], null, 2)}
- Transa\xE7\xF5es Recentes:
${JSON.stringify((financialContext.recentTransactions || []).slice(0, 10), null, 2)}
      `.trim();
    }
    const systemInstruction = `Voc\xEA \xE9 o "FinBot AI", o consultor financeiro integrado ao sistema FinControl.
Sua miss\xE3o \xE9 dar orienta\xE7\xF5es financeiras precisas, pr\xE1ticas, respons\xE1veis e objetivas com base nos dados do usu\xE1rio. N\xE3o use emojis em suas respostas.

CONTEXTO FINANCEIRO DO USU\xC1RIO EM TEMPO REAL:
${contextSummary}

COMO RESPONDER D\xDAVIDAS E PERGUNTAS DE COMPRA (Exemplo: "\xC9 poss\xEDvel comprar esse ventilador custando 300 reais?"):
1. Verifique o saldo dispon\xEDvel atual (conta principal do usu\xE1rio) e o total em contas.
2. Analise os compromissos pendentes: quanto ainda tem de despesas/contas fixas e parcelas a vencer neste m\xEAs.
3. Subtraia as contas pendentes do saldo dispon\xEDvel para encontrar a folga real de fluxo de caixa (saldo livre).
4. D\xEA uma resposta CLARA, DIRETA e OBJETIVA no in\xEDcio:
   - Se couber com tranquilidade: "Sim, \xE9 poss\xEDvel comprar o ventilador de R$ 300 com tranquilidade." Mostre as contas: saldo dispon\xEDvel, contas pendentes e a sobra l\xEDquida.
   - Se for apertado: "\xC9 poss\xEDvel, mas com ressalvas." Explique que sobrar\xE1 pouco para imprevistos.
   - Se n\xE3o couber ou comprometer contas essenciais: "N\xE3o \xE9 recomend\xE1vel realizar essa compra agora." Mostre o motivo e alternativas pr\xE1ticas.
5. Responda em Portugu\xEAs do Brasil de forma concisa e profissional, sem emojis.
6. Use formata\xE7\xE3o limpa com Markdown (negrito para valores monet\xE1rios, listas com t\xF3picos).
7. Mantenha respostas curtas e f\xE1ceis de ler.`;
    const contents = messages.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const candidateModels = [
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3-flash-preview"
    ];
    let reply = "";
    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const timeoutMs = 3500;
        let timerId;
        const timeoutPromise = new Promise((_, reject) => {
          timerId = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido para ${modelName}`)), timeoutMs);
        });
        const genPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        const response = await Promise.race([genPromise, timeoutPromise]).finally(() => {
          clearTimeout(timerId);
        });
        if (response && response.text) {
          reply = response.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[FinControl AI] Tentativa com modelo ${modelName} falhou:`, err?.message || err);
      }
    }
    if (!reply) {
      console.warn("[FinControl AI] Modelos Gemini indispon\xEDveis ou lentos. Usando fallback de an\xE1lise financeira.");
      reply = generateLocalFinancialAnalysis(lastUserMessage, financialContext);
    }
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Erro na rota /api/chat:", error);
    try {
      const messages = req.body?.messages;
      const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content : "";
      const fallbackReply = generateLocalFinancialAnalysis(lastMsg, req.body?.financialContext);
      return res.status(200).json({ reply: fallbackReply });
    } catch {
      return res.status(200).json({
        reply: "Ol\xE1! Estou processando suas informa\xE7\xF5es financeiras. Por favor, reformule sua d\xFAvida sobre saldo ou compras pendentes."
      });
    }
  }
}

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function createApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    return handler(req, res);
  });
  app.post("/api/chat", (req, res) => {
    return handler2(req, res);
  });
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3e3,
        hmr: false,
        watch: null
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  return app;
}
async function startServer() {
  if (process.env.VERCEL) {
    return;
  }
  const PORT = Number(process.env.PORT) || 3e3;
  const app = await createApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FinControl Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
export {
  createApp
};
