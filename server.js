var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  createApp: () => createApp
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_dotenv = __toESM(require("dotenv"), 1);

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
var import_genai = require("@google/genai");
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave de API do Gemini n\xE3o configurada no ambiente do servidor."
      });
    }
    const ai = new import_genai.GoogleGenAI({
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
      "gemini-3-flash-preview",
      "gemini-flash-latest",
      "gemini-3.8-flash"
    ];
    let reply = "";
    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7
          }
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
      throw lastError || new Error("N\xE3o foi poss\xEDvel obter resposta dos modelos de IA.");
    }
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Erro ao consultar Gemini na API:", error);
    return res.status(500).json({
      error: error.message || "Erro interno ao consultar o assistente de intelig\xEAncia artificial."
    });
  }
}

// server.ts
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function createApp() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    return handler(req, res);
  });
  app.post("/api/chat", (req, res) => {
    return handler2(req, res);
  });
  if (process.env.NODE_ENV === "production") {
    app.use(import_express.default.static(import_path.default.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await (0, import_vite.createServer)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp
});
