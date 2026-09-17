import React from 'react';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { CalendarClock, CheckCircle2, ArrowRight } from 'lucide-react';

interface UpcomingBillsProps {
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string;
  privacyMode: boolean;
  onMarkAsPaid: (id: string) => void;
  onViewAllTransactions: () => void;
}

export const UpcomingBills: React.FC<UpcomingBillsProps> = ({
  transactions,
  categories,
  currentMonth,
  privacyMode,
  onMarkAsPaid,
  onViewAllTransactions,
}) => {
  const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));

  // Filtrar pendentes do mês ordenadas por data
  const pendingBills = transactions
    .filter(t => t.status === 'pending' && t.date.startsWith(currentMonth))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  if (pendingBills.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-5 h-5 text-lime-400" />
          <h3 className="font-bold text-white text-base">Contas & Previsões</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-xs">Tudo em dia para este mês!</h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Não há contas ou recebimentos pendentes agendados.
          </p>
        </div>
        <button
          onClick={onViewAllTransactions}
          className="w-full mt-2 py-2 text-xs font-bold text-lime-400 hover:text-lime-300 hover:bg-zinc-800 rounded-xl transition-colors text-center cursor-pointer"
        >
          Ver histórico completo
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-lime-400" />
            <h3 className="font-bold text-white text-base">Contas & Previsões</h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {pendingBills.length} pendentes
          </span>
        </div>

        <div className="space-y-2.5">
          {pendingBills.map(tx => {
            const cat = categoryMap.get(tx.category);
            const isExpense = tx.type === 'expense';

            return (
              <div
                key={tx.id}
                className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-850/60 hover:bg-zinc-800/80 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: cat?.color || '#84cc16' }}
                  >
                    <CategoryIcon name={cat?.iconName || 'CalendarClock'} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-xs block truncate">
                      {tx.description}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Vence em {formatDateBR(tx.date)} • {tx.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-bold text-xs ${
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isExpense ? '-' : '+'} {formatCurrency(tx.amount, privacyMode)}
                  </span>
                  <button
                    onClick={() => onMarkAsPaid(tx.id)}
                    className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer"
                    title={isExpense ? 'Marcar como pago' : 'Marcar como recebido'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onViewAllTransactions}
        className="w-full mt-4 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-950 bg-lime-400 hover:bg-lime-300 rounded-xl transition-all cursor-pointer shadow-md shadow-lime-400/20"
      >
        <span>Gerenciar todas as transações</span>
        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );
};
