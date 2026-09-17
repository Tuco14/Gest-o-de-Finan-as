import React from 'react';
import { 
  WalletCards, 
  Plus, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  LayoutDashboard, 
  ReceiptText, 
  Target, 
  BarChart3,
  Calendar
} from 'lucide-react';
import { formatMonthYear } from '../utils/formatters';

interface HeaderProps {
  currentMonth: string; // YYYY-MM
  setCurrentMonth: (month: string) => void;
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  activeTab: 'overview' | 'transactions' | 'budgets' | 'reports';
  setActiveTab: (tab: 'overview' | 'transactions' | 'budgets' | 'reports') => void;
  onOpenNewTransaction: (type?: 'income' | 'expense') => void;
  onExportCSV: () => void;
  transactionsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  setCurrentMonth,
  privacyMode,
  setPrivacyMode,
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  onExportCSV,
}) => {
  // Funções para navegar entre meses
  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(current);
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-30 shadow-md">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lime-400 shadow-sm">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-lg">FinControl</span>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30">
                  SaaS Pro
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">Gestão Financeira & Fluxo de Caixa</p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-zinc-800/90 rounded-xl p-1 border border-zinc-700/80">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              aria-label="Mês Anterior"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              id="current-month-btn"
              onClick={handleCurrentMonth}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Clique para voltar ao mês atual"
            >
              <Calendar className="w-3.5 h-3.5 text-lime-400" />
              <span>{formatMonthYear(currentMonth)}</span>
            </button>

            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              aria-label="Próximo Mês"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Privacy toggle */}
            <button
              id="privacy-toggle-btn"
              onClick={() => setPrivacyMode(!privacyMode)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title={privacyMode ? 'Mostrar valores' : 'Ocultar valores por privacidade'}
              aria-label="Alternar modo privacidade"
            >
              {privacyMode ? <EyeOff className="w-5 h-5 text-lime-400" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Export CSV */}
            <button
              id="export-csv-btn"
              onClick={onExportCSV}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              title="Exportar dados para planilha CSV"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>Exportar</span>
            </button>

            {/* Nova Transação CTA: Verde Limão Amarelado */}
            <button
              id="new-transaction-btn"
              onClick={() => onOpenNewTransaction()}
              className="flex items-center gap-1.5 px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl shadow-md shadow-lime-400/20 hover:shadow-lime-400/30 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 border-t border-zinc-800 pt-1">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-lime-400 text-lime-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            id="tab-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'border-lime-400 text-lime-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Transações</span>
          </button>

          <button
            id="tab-budgets"
            onClick={() => setActiveTab('budgets')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'budgets'
                ? 'border-lime-400 text-lime-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Orçamentos & Metas</span>
          </button>

          <button
            id="tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-lime-400 text-lime-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios & Análise</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
