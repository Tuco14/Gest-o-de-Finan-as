import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function formatBRL(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractPrice(text: string): number | null {
  const patterns = [
    /R\$\s*([\d\.,]+)/i,
    /([\d\.,]+)\s*(?:reais|real)/i,
    /(?:custa|custando|por|valor\s*(?:de)?)\s*(?:R\$)?\s*([\d\.,]+)/i,
    /(\d+(?:[.,]\d{1,2})?)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const cleaned = m[1].replace(/\./g, '').replace(',', '.');
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

function generateLocalFinancialAnalysis(userMessage: string, financialContext: any): string {
  const availableBalance = Number(financialContext?.availableBalance || 0);
  const totalBalance = Number(financialContext?.totalBalance || availableBalance);
  const pendingExpense = Number(financialContext?.monthlyMetrics?.pendingExpense || 0);
  const totalExpense = Number(financialContext?.monthlyMetrics?.totalExpense || 0);
  const totalIncome = Number(financialContext?.monthlyMetrics?.totalIncome || 0);
  const paidIncome = Number(financialContext?.monthlyMetrics?.paidIncome || 0);
  const paidExpense = Number(financialContext?.monthlyMetrics?.paidExpense || 0);
  const currentMonth = financialContext?.currentMonth || 'deste mês';

  // Folga real de caixa (saldo disponível menos compromissos pendentes)
  const saldoLivre = Math.round((availableBalance - pendingExpense) * 100) / 100;

  // Análise de compra se o usuário informar ou perguntar sobre um gasto
  const purchasePrice = extractPrice(userMessage);
  const lowerMsg = userMessage.toLowerCase();
  const isPurchaseQuery = purchasePrice !== null && (
    lowerMsg.includes('posso') ||
    lowerMsg.includes('comprar') ||
    lowerMsg.includes('gastar') ||
    lowerMsg.includes('vale') ||
    lowerMsg.includes('dá pra') ||
    lowerMsg.includes('da pra') ||
    lowerMsg.includes('cabe') ||
    lowerMsg.includes('reais')
  );

  if (isPurchaseQuery && purchasePrice !== null) {
    const sobraAposCompra = Math.round((saldoLivre - purchasePrice) * 100) / 100;

    if (purchasePrice <= saldoLivre * 0.7 && saldoLivre > 0) {
      return `Sim, é possível realizar essa compra de **R$ ${formatBRL(purchasePrice)}** com tranquilidade.

Sua situação financeira atual permite essa aquisição sem comprometer suas obrigações programadas:

* **Saldo Disponível (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do Mês:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor da Compra:** R$ ${formatBRL(purchasePrice)}
* **Sobra Estimada Após a Compra:** **R$ ${formatBRL(sobraAposCompra)}**

Essa compra compromete menos de 70% do seu saldo livre atual, preservando uma margem segura para imprevistos.`;
    } else if (purchasePrice <= saldoLivre && saldoLivre > 0) {
      return `É possível realizar a compra de **R$ ${formatBRL(purchasePrice)}**, mas com ressalvas.

Confira os dados do seu fluxo de caixa:

* **Saldo Disponível (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do Mês:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor da Compra:** R$ ${formatBRL(purchasePrice)}
* **Sobra Restante:** **R$ ${formatBRL(sobraAposCompra)}**

Após essa compra, restará uma margem estreita para cobrir eventuais imprevistos até o encerramento do mês.`;
    } else {
      const deficit = Math.abs(Math.round((purchasePrice - saldoLivre) * 100) / 100);
      return `Não é recomendável realizar a compra de **R$ ${formatBRL(purchasePrice)}** agora.

O valor excede a sua folga real de caixa após descontar as contas pendentes:

* **Saldo Disponível (Conta Principal):** R$ ${formatBRL(availableBalance)}
* **Compromissos Pendentes do Mês:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**
* **Valor Necessário:** R$ ${formatBRL(purchasePrice)}
* **Déficit:** **R$ ${formatBRL(deficit)}**

Recomendamos aguardar o recebimento de novas receitas ou a quitação das despesas pendentes prioritárias antes de realizar esse gasto.`;
    }
  }

  if (lowerMsg.includes('saldo') || lowerMsg.includes('resumo') || lowerMsg.includes('mês') || lowerMsg.includes('mes') || lowerMsg.includes('contas')) {
    return `Aqui está o panorama financeiro de **${currentMonth}**:

* **Saldo Disponível (Conta Principal):** **R$ ${formatBRL(availableBalance)}**
* **Saldo Total em Contas:** R$ ${formatBRL(totalBalance)}
* **Receitas do Mês:** R$ ${formatBRL(totalIncome)} (Recebido: R$ ${formatBRL(paidIncome)} | Pendente: R$ ${formatBRL(financialContext?.monthlyMetrics?.pendingIncome || 0)})
* **Despesas do Mês:** R$ ${formatBRL(totalExpense)} (Pago: R$ ${formatBRL(paidExpense)} | Pendente: R$ ${formatBRL(pendingExpense)})
* **Folga Livre de Caixa:** **R$ ${formatBRL(saldoLivre)}**

Você pode me perguntar se cabe uma despesa específica no seu orçamento ou tirar dúvidas sobre suas contas a pagar.`;
  }

  return `Olá. Sou o FinBot AI, o consultor financeiro integrado ao FinControl.

Seus dados financeiros estão conectados em tempo real:

* **Saldo Disponível:** R$ ${formatBRL(availableBalance)}
* **Despesas Pendentes:** R$ ${formatBRL(pendingExpense)}
* **Folga Real de Caixa:** **R$ ${formatBRL(saldoLivre)}**

Você pode me fazer perguntas práticas como:
- *"Posso comprar um item de R$ 250 agora?"*
- *"Como está meu mês financeiro?"*
- *"Quanto ainda tenho que pagar de contas?"*

Como posso orientar você hoje?`;
}

export default async function handler(req: any, res: any) {
  // Configuração de cabeçalhos de resposta
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido. Utilize POST.` });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { messages, financialContext } = body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Lista de mensagens inválida ou vazia.' });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Aceita qualquer uma das variáveis comuns de ambiente
    const apiKey = process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.VITE_GEMINI_API_KEY || 
                   process.env.VITE_GOOGLE_API_KEY;

    // Se nenhuma chave de IA estiver configurada, responde com o motor local inteligente
    if (!apiKey) {
      console.warn('[FinControl AI] Nenhuma chave Gemini detectada. Utilizando análise financeira local.');
      const reply = generateLocalFinancialAnalysis(lastUserMessage, financialContext);
      return res.status(200).json({ reply });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Constrói o contexto financeiro em tempo real
    let contextSummary = 'Nenhum dado financeiro específico informado.';
    if (financialContext) {
      contextSummary = `
- Saldo Disponível (Conta Principal): R$ ${Number(financialContext.availableBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Contas e Carteiras (Total de saldos): R$ ${Number(financialContext.totalBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Detalhes das Contas: ${JSON.stringify(financialContext.accounts || [], null, 2)}
- Mês de Referência: ${financialContext.currentMonth || 'Mês atual'}
- Receitas do Mês: Total R$ ${Number(financialContext.monthlyMetrics?.totalIncome || 0).toFixed(2)} (Recebido: R$ ${Number(financialContext.monthlyMetrics?.paidIncome || 0).toFixed(2)}, Pendente: R$ ${Number(financialContext.monthlyMetrics?.pendingIncome || 0).toFixed(2)})
- Despesas do Mês: Total R$ ${Number(financialContext.monthlyMetrics?.totalExpense || 0).toFixed(2)} (Pago: R$ ${Number(financialContext.monthlyMetrics?.paidExpense || 0).toFixed(2)}, Pendente: R$ ${Number(financialContext.monthlyMetrics?.pendingExpense || 0).toFixed(2)})
- Contas a Pagar / Parcelas Cadastradas:
${JSON.stringify(financialContext.bills || [], null, 2)}
- Metas Financeiras:
${JSON.stringify(financialContext.goals || [], null, 2)}
- Transações Recentes:
${JSON.stringify((financialContext.recentTransactions || []).slice(0, 10), null, 2)}
      `.trim();
    }

    const systemInstruction = `Você é o "FinBot AI", o consultor financeiro integrado ao sistema FinControl.
Sua missão é dar orientações financeiras precisas, práticas, responsáveis e objetivas com base nos dados do usuário. Não use emojis em suas respostas.

CONTEXTO FINANCEIRO DO USUÁRIO EM TEMPO REAL:
${contextSummary}

COMO RESPONDER DÚVIDAS E PERGUNTAS DE COMPRA (Exemplo: "É possível comprar esse ventilador custando 300 reais?"):
1. Verifique o saldo disponível atual (conta principal do usuário) e o total em contas.
2. Analise os compromissos pendentes: quanto ainda tem de despesas/contas fixas e parcelas a vencer neste mês.
3. Subtraia as contas pendentes do saldo disponível para encontrar a folga real de fluxo de caixa (saldo livre).
4. Dê uma resposta CLARA, DIRETA e OBJETIVA no início:
   - Se couber com tranquilidade: "Sim, é possível comprar o ventilador de R$ 300 com tranquilidade." Mostre as contas: saldo disponível, contas pendentes e a sobra líquida.
   - Se for apertado: "É possível, mas com ressalvas." Explique que sobrará pouco para imprevistos.
   - Se não couber ou comprometer contas essenciais: "Não é recomendável realizar essa compra agora." Mostre o motivo e alternativas práticas.
5. Responda em Português do Brasil de forma concisa e profissional, sem emojis.
6. Use formatação limpa com Markdown (negrito para valores monetários, listas com tópicos).
7. Mantenha respostas curtas e fáceis de ler.`;

    // Formata o histórico de mensagens para a API Gemini
    const contents = messages.map((m: { role: 'user' | 'assistant' | 'model'; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Modelos candidatos em ordem de preferência e resiliência
    const candidateModels = [
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3-flash-preview',
    ];

    let reply = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const timeoutMs = 3500;
        let timerId: any;
        const timeoutPromise = new Promise((_, reject) => {
          timerId = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido para ${modelName}`)), timeoutMs);
        });

        const genPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]).finally(() => {
          clearTimeout(timerId);
        });

        if (response && response.text) {
          reply = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[FinControl AI] Tentativa com modelo ${modelName} falhou:`, err?.message || err);
      }
    }

    if (!reply) {
      console.warn('[FinControl AI] Modelos Gemini indisponíveis ou lentos. Usando fallback de análise financeira.');
      reply = generateLocalFinancialAnalysis(lastUserMessage, financialContext);
    }

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    // Em caso de erro imprevisto, retorna a análise financeira local em vez de quebrar a tela
    try {
      const messages = req.body?.messages;
      const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content : '';
      const fallbackReply = generateLocalFinancialAnalysis(lastMsg, req.body?.financialContext);
      return res.status(200).json({ reply: fallbackReply });
    } catch {
      return res.status(200).json({
        reply: 'Olá! Estou processando suas informações financeiras. Por favor, reformule sua dúvida sobre saldo ou compras pendentes.',
      });
    }
  }
}
