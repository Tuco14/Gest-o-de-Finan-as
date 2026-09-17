import React, { useState, useEffect, useMemo } from 'react';
import { 
  Transaction, 
  Category, 
  Account, 
  FinancialGoal, 
  TransactionType 
} from './types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_GOALS 
} from './utils/initialData';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { CashFlowChart } from './components/CashFlowChart';
import { CategoryDonutChart } from './components/CategoryDonutChart';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { BudgetsView } from './components/BudgetsView';
import { ReportsView } from './components/ReportsView';
import { AccountsSummary } from './components/AccountsSummary';
import { UpcomingBills } from './components/UpcomingBills';
import { formatCurrency } from './utils/formatters';
import { 
  CheckCircle, 
  RotateCcw, 
  Plus, 
  FileSpreadsheet, 
  Sparkles, 
  Shield 
} from 'lucide-react';

export default function App() {
  // LocalStorage initialization
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fincontrol_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('fincontrol_categories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('fincontrol_accounts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_ACCOUNTS;
  });

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = localStorage.getItem('fincontrol_goals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_GOALS;
  });

  // Estado do mês ativo (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    // Default to 2026-09 as per mock time context
    return '2026-09';
  });

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('fincontrol_privacy') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets' | 'reports'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalInitialType, setModalInitialType] = useState<TransactionType>('expense');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('fincontrol_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fincontrol_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('fincontrol_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('fincontrol_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('fincontrol_privacy', String(privacyMode));
  }, [privacyMode]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Totais do mês ativo
  const monthlyMetrics = useMemo(() => {
    let totalIncome = 0;
    let pendingIncome = 0;
    let totalExpense = 0;
    let pendingExpense = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonth)) {
        if (t.type === 'income') {
          totalIncome += t.amount;
          if (t.status === 'pending') pendingIncome += t.amount;
        } else {
          totalExpense += t.amount;
          if (t.status === 'pending') pendingExpense += t.amount;
        }
      }
    });

    // Saldo consolidado das contas
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    return {
      totalBalance,
      totalIncome,
      pendingIncome,
      totalExpense,
      pendingExpense,
    };
  }, [transactions, accounts, currentMonth]);

  // Handlers para Transações
  const handleOpenNewTransaction = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (tx: Transaction) => {
    if (editingTransaction) {
      setTransactions(prev => prev.map(t => (t.id === tx.id ? tx : t)));
      showToast('Transação atualizada com sucesso!');
    } else {
      setTransactions(prev => [tx, ...prev]);
      showToast('Novo lançamento registrado com sucesso!');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Transação excluída');
    }
  };

  const handleToggleStatus = (id: string) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === 'paid' ? 'pending' : 'paid';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
    showToast('Status da transação alterado');
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    const duplicated: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      description: `${tx.description} (Cópia)`,
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [duplicated, ...prev]);
    showToast('Transação duplicada!');
  };

  // Handlers para Categorias e Metas
  const handleUpdateCategoryBudget = (catId: string, newBudget: number) => {
    setCategories(prev =>
      prev.map(c => (c.id === catId ? { ...c, budgetMonthly: newBudget } : c))
    );
    showToast('Orçamento atualizado!');
  };

  const handleAddGoal = (goal: FinancialGoal) => {
    setGoals(prev => [...prev, goal]);
    showToast('Nova meta financeira criada!');
  };

  const handleUpdateGoalAmount = (goalId: string, addAmount: number) => {
    setGoals(prev =>
      prev.map(g =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + addAmount } : g
      )
    );
    showToast(`Aporte de ${formatCurrency(addAmount)} adicionado à meta!`);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    showToast('Meta removida');
  };

  // Handlers para Contas
  const handleAddAccount = (acc: Account) => {
    setAccounts(prev => [...prev, acc]);
    showToast('Conta adicionada com sucesso!');
  };

  const handleUpdateBalance = (accId: string, newBalance: number) => {
    setAccounts(prev =>
      prev.map(a => (a.id === accId ? { ...a, balance: newBalance } : a))
    );
    showToast('Saldo da conta ajustado!');
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const accMap = new Map(accounts.map(a => [a.id, a.name]));

    const headers = ['Data', 'Descricao', 'Tipo', 'Categoria', 'Valor (R$)', 'Status', 'Conta', 'Metodo', 'Anotacoes'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Receita' : 'Despesa',
      `"${catMap.get(t.category) || t.category}"`,
      t.amount.toFixed(2),
      t.status === 'paid' ? 'Pago' : 'Pendente',
      `"${accMap.get(t.accountId) || t.accountId}"`,
      t.paymentMethod,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fincontrol-transacoes-${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV baixado com sucesso!');
  };

  // Reset para dados iniciais
  const handleResetData = () => {
    if (confirm('Atenção: deseja restaurar todos os dados para o padrão inicial de demonstração?')) {
      localStorage.removeItem('fincontrol_transactions');
      localStorage.removeItem('fincontrol_categories');
      localStorage.removeItem('fincontrol_accounts');
      localStorage.removeItem('fincontrol_goals');
      setTransactions(INITIAL_TRANSACTIONS);
      setCategories(INITIAL_CATEGORIES);
      setAccounts(INITIAL_ACCOUNTS);
      setGoals(INITIAL_GOALS);
      showToast('Dados restaurados com sucesso!');
    }
  };

  // Redirecionamento da categoria para a aba de transações
  const handleSelectCategoryFromDonut = (catId: string) => {
    setSelectedCategoryFilter(catId);
    setActiveTab('transactions');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-zinc-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-lime-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header com Navegação e Controles */}
      <Header
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        privacyMode={privacyMode}
        setPrivacyMode={setPrivacyMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        onExportCSV={handleExportCSV}
        transactionsCount={transactions.length}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cards de Métricas Principais (Sempre visíveis no topo) */}
        <MetricCards
          totalBalance={monthlyMetrics.totalBalance}
          totalIncome={monthlyMetrics.totalIncome}
          pendingIncome={monthlyMetrics.pendingIncome}
          totalExpense={monthlyMetrics.totalExpense}
          pendingExpense={monthlyMetrics.pendingExpense}
          privacyMode={privacyMode}
          onQuickIncome={() => handleOpenNewTransaction('income')}
          onQuickExpense={() => handleOpenNewTransaction('expense')}
        />

        {/* Visualização por Abas */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Gráficos em Grade */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <CashFlowChart
                  transactions={transactions}
                  currentMonth={currentMonth}
                  privacyMode={privacyMode}
                />
              </div>
              <div className="lg:col-span-5">
                <CategoryDonutChart
                  categories={categories}
                  transactions={transactions}
                  currentMonth={currentMonth}
                  privacyMode={privacyMode}
                  onSelectCategory={handleSelectCategoryFromDonut}
                />
              </div>
            </div>

            {/* Contas bancárias e Próximos vencimentos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <AccountsSummary
                  accounts={accounts}
                  privacyMode={privacyMode}
                  onAddAccount={handleAddAccount}
                  onUpdateBalance={handleUpdateBalance}
                />
              </div>
              <div className="lg:col-span-5">
                <UpcomingBills
                  transactions={transactions}
                  categories={categories}
                  currentMonth={currentMonth}
                  privacyMode={privacyMode}
                  onMarkAsPaid={handleToggleStatus}
                  onViewAllTransactions={() => setActiveTab('transactions')}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-200">
            <TransactionList
              transactions={transactions.filter(t => t.date.startsWith(currentMonth))}
              categories={categories}
              accounts={accounts}
              privacyMode={privacyMode}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onToggleStatus={handleToggleStatus}
              onDuplicate={handleDuplicateTransaction}
              onOpenNew={handleOpenNewTransaction}
              selectedCategoryFilter={selectedCategoryFilter}
              onClearCategoryFilter={() => setSelectedCategoryFilter('')}
            />
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="animate-in fade-in duration-200">
            <BudgetsView
              categories={categories}
              transactions={transactions}
              goals={goals}
              currentMonth={currentMonth}
              privacyMode={privacyMode}
              onUpdateCategoryBudget={handleUpdateCategoryBudget}
              onAddGoal={handleAddGoal}
              onUpdateGoalAmount={handleUpdateGoalAmount}
              onDeleteGoal={handleDeleteGoal}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-200">
            <ReportsView
              transactions={transactions}
              categories={categories}
              currentMonth={currentMonth}
              privacyMode={privacyMode}
            />
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-zinc-800/80 bg-zinc-900 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">FinControl</span>
            <span>•</span>
            <span>Plataforma SaaS de Gestão Financeira Inteligente</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExportCSV}
              className="hover:text-lime-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Dados</span>
            </button>
            <button
              onClick={handleResetData}
              className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Restaurar dados iniciais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Demonstração</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modal de Nova / Editar Transação */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        categories={categories}
        accounts={accounts}
        editingTransaction={editingTransaction}
        initialType={modalInitialType}
        currentMonth={currentMonth}
      />
    </div>
  );
}
