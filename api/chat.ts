import { GoogleGenAI } from '@google/genai';

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chave de API do Gemini não configurada no ambiente do servidor.',
      });
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

    // Modelos candidatos em ordem de preferência
    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    let reply = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
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
      throw lastError || new Error('Não foi possível obter resposta dos modelos de IA.');
    }

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Erro ao consultar Gemini na API:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno ao consultar o assistente de inteligência artificial.',
    });
  }
}
