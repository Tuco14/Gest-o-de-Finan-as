import React, { useMemo } from 'react';
import { Transaction, Category } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { 
  BarChart3, 
  ShieldCheck, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle, 
  Scale, 
  ArrowUpRight, 
  CheckCircle2,
  PieChart
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string;
  privacyMode: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  currentMonth,
  privacyMode,
}) => {
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Estatísticas do mês atual
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catExpenseMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonth)) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
          catExpenseMap[t.category] = (catExpenseMap[t.category] || 0) + t.amount;
        }
      }
    });

    const net = income - expense;
    const savingsRate = income > 0 ? Math.max(0, (net / income) * 100) : 0;

    // Regra 50-30-20 aproximada
    // Necessidades: moradia, alimentacao, transporte, saude
    // Desejos: lazer, assinaturas, outros
    let needs = 0;
    let wants = 0;

    Object.entries(catExpenseMap).forEach(([catId, amt]) => {
      if (['cat-moradia', 'cat-alimentacao', 'cat-transporte', 'cat-saude'].includes(catId)) {
        needs += amt;
      } else {
        wants += amt;
      }
    });

    const needsRate = income > 0 ? (needs / income) * 100 : 0;
    const wantsRate = income > 0 ? (wants / income) * 100 : 0;

    // Financial Health Score (0 a 100)
    let score = 50;
    if (savingsRate >= 20) score += 25;
    else if (savingsRate >= 10) score += 15;
    else if (savingsRate > 0) score += 5;
    else score -= 20;

    if (needsRate <= 55) score += 15;
    else if (needsRate > 70) score -= 10;

    if (wantsRate <= 30) score += 10;
    else if (wantsRate > 40) score -= 10;

    score = Math.min(100, Math.max(10, score));

    // Top 5 maiores despesas individuais
    const topExpenses = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const hasData = income > 0 || expense > 0;

    return {
      income,
      expense,
      net,
      savingsRate,
      needs,
      wants,
      needsRate,
      wantsRate,
      score,
      hasData,
      topExpenses,
    };
  }, [transactions, currentMonth]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Score de Saúde Financeira */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden border border-zinc-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-lime-400 text-xs font-bold tracking-wider uppercase">
              Diagnóstico Mensal • {formatMonthYear(currentMonth)}
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
              Score de Saúde Financeira
            </h3>
            <p className="text-zinc-400 text-xs mt-1 max-w-lg">
              Avaliação algorítmica do seu equilíbrio entre ganhos, custos essenciais e capacidade de poupança no período.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-800/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-zinc-700">
            <div className="text-center">
              <span className="text-4xl font-extrabold tracking-tight text-lime-400">
                {stats.hasData ? stats.score : '--'}
              </span>
              <span className="text-xs text-zinc-400 font-semibold block">/100 pontos</span>
            </div>
            <div className="h-10 w-px bg-zinc-700" />
            <div>
              <span className="text-xs font-bold text-white block">
                {!stats.hasData
                  ? 'Pronto para o Uso'
                  : stats.score >= 80
                  ? 'Saúde Financeira Blindada'
                  : stats.score >= 65
                  ? 'Perfil Financeiro Saudável'
                  : 'Atenção aos Custos Fixos'}
              </span>
              <span className="text-[11px] text-zinc-400">
                {!stats.hasData
                  ? 'Lance suas receitas e despesas para gerar o diagnóstico'
                  : stats.savingsRate >= 20
                  ? `Guardando ${stats.savingsRate.toFixed(1)}% das receitas`
                  : 'Foque em reduzir gastos com estilo de vida'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 50/30/20 vs Maiores Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Metodologia 50/30/20 */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-lime-400" />
              <h4 className="font-bold text-white text-base">Distribuição Ideal (Regra 50 / 30 / 20)</h4>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Benchmark padrão para equilibrar necessidades básicas, desejos e investimentos
            </p>

            <div className="space-y-4">
              {/* 50% Necessidades */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">Necessidades Essenciais (Meta: 50%)</span>
                  <span className={stats.needsRate <= 55 ? 'text-lime-400' : 'text-amber-400'}>
                    {stats.needsRate.toFixed(1)}% ({formatCurrency(stats.needs, privacyMode)})
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stats.needsRate <= 55 ? 'bg-lime-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, stats.needsRate)}%` }}
                  />
                </div>
              </div>

              {/* 30% Desejos / Estilo de Vida */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">Desejos & Lazer (Meta: 30%)</span>
                  <span className={stats.wantsRate <= 35 ? 'text-lime-400' : 'text-rose-400'}>
                    {stats.wantsRate.toFixed(1)}% ({formatCurrency(stats.wants, privacyMode)})
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stats.wantsRate <= 35 ? 'bg-lime-400' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, stats.wantsRate)}%` }}
                  />
                </div>
              </div>

              {/* 20% Poupança */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-300">Poupança & Futuro (Meta: 20%)</span>
                  <span className={stats.savingsRate >= 20 ? 'text-emerald-400' : 'text-zinc-400'}>
                    {stats.savingsRate.toFixed(1)}% ({formatCurrency(stats.net > 0 ? stats.net : 0, privacyMode)})
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, stats.savingsRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
            <span>
              {stats.savingsRate >= 20
                ? 'Parabéns! Sua meta de poupança está acima da média recomendada.'
                : 'Dica: Reduzir 5% nos gastos supérfluos aumentará sua poupança consideravelmente.'}
            </span>
          </div>
        </div>

        {/* Maiores Lançamentos do Mês */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-lime-400" />
              <h4 className="font-bold text-white text-base">Top 5 Maiores Despesas do Mês</h4>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Itens individuais com maior impacto no seu orçamento em {currentMonth}
            </p>

            <div className="divide-y divide-zinc-800">
              {stats.topExpenses.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nenhuma despesa registrada neste mês ainda.
                </div>
              ) : (
                stats.topExpenses.map((tx, idx) => {
                  const cat = categoryMap.get(tx.category);
                  const percentOfTotal = stats.expense > 0 ? (tx.amount / stats.expense) * 100 : 0;

                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-white text-xs block">
                            {tx.description}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {cat?.name} • {tx.paymentMethod}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 text-xs block">
                          {formatCurrency(tx.amount, privacyMode)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {percentOfTotal.toFixed(1)}% do mês
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Soma dos 5 maiores:</span>
            <span className="font-bold text-white">
              {formatCurrency(
                stats.topExpenses.reduce((acc, t) => acc + t.amount, 0),
                privacyMode
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Insights Inteligentes */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-lime-400" />
          <h4 className="font-bold text-white text-sm">Insights & Recomendações Estratégicas</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800">
            <span className="font-bold block mb-1 text-lime-400">Otimização de Assinaturas</span>
            <p className="text-zinc-300 leading-relaxed">
              Você tem despesas com assinaturas e serviços digitais. Faça uma auditoria semestral para cancelar planos que não utiliza diariamente.
            </p>
          </div>
          <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800">
            <span className="font-bold block mb-1 text-lime-400">Reserva de Oportunidade</span>
            <p className="text-zinc-300 leading-relaxed">
              Manter uma reserva líquida com rendimento atrelado ao CDI garante poder de negociação à vista com descontos em compras planejadas.
            </p>
          </div>
          <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800">
            <span className="font-bold block mb-1 text-lime-400">Previsão de Fluxo</span>
            <p className="text-zinc-300 leading-relaxed">
              Lançamentos pendentes e faturas futuras já estão contabilizados na sua projeção para evitar juros ou surpresas no fim do mês.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
