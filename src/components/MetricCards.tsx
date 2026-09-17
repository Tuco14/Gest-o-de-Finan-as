import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps {
  totalBalance: number;
  totalIncome: number;
  pendingIncome: number;
  totalExpense: number;
  pendingExpense: number;
  privacyMode: boolean;
  onQuickIncome: () => void;
  onQuickExpense: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalBalance,
  totalIncome,
  pendingIncome,
  totalExpense,
  pendingExpense,
  privacyMode,
  onQuickIncome,
  onQuickExpense,
}) => {
  const netMonthly = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netMonthly / totalIncome) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Total */}
      <div 
        id="card-total-balance"
        className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md hover:border-zinc-700 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Saldo Disponível</span>
          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-lime-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalBalance, privacyMode)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-400">
            <span>Resultado do mês:</span>
            <span className={`font-semibold ${netMonthly >= 0 ? 'text-lime-400' : 'text-rose-400'}`}>
              {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly, privacyMode)}
            </span>
          </div>
        </div>
      </div>

      {/* Receitas */}
      <div 
        id="card-total-income"
        className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Receitas do Mês</span>
          <button 
            id="quick-income-btn"
            onClick={onQuickIncome}
            className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-zinc-950 transition-colors cursor-pointer"
            title="Adicionar receita rápida"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(totalIncome, privacyMode)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Entradas totais</span>
            </span>
            {pendingIncome > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-medium" title="Receitas a receber neste mês">
                <Clock className="w-3 h-3" />
                <span>{formatCurrency(pendingIncome, privacyMode)} pendente</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Despesas */}
      <div 
        id="card-total-expense"
        className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md hover:border-rose-500/40 transition-all flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-rose-400 tracking-wide uppercase">Despesas do Mês</span>
          <button 
            id="quick-expense-btn"
            onClick={onQuickExpense}
            className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
            title="Adicionar despesa rápida"
          >
            <ArrowDownRight className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {formatCurrency(totalExpense, privacyMode)}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Saídas totais</span>
            </span>
            {pendingExpense > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-medium" title="Despesas a pagar neste mês">
                <Clock className="w-3 h-3" />
                <span>{formatCurrency(pendingExpense, privacyMode)} a pagar</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Taxa de Poupança */}
      <div 
        id="card-savings-rate"
        className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md hover:border-lime-400/40 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-lime-400 tracking-wide uppercase">Taxa de Poupança</span>
          <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 flex items-center justify-center">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {savingsRate.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-zinc-400">
              {savingsRate >= 20 ? 'Excelente ritmo!' : savingsRate > 0 ? 'Positivo' : 'Alerta de déficit'}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                savingsRate >= 20 ? 'bg-lime-400' : savingsRate >= 10 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
