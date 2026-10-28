export function formatBRL(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function extractPriceFromText(text: string): number | null {
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

export function generateClientFinancialFallback(userMessage: string, financialContext: any): string {
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

  const purchasePrice = extractPriceFromText(userMessage);
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
