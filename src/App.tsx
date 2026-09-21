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
import { OfflineIndicator } from './components/OfflineIndicator';
import { formatCurrency } from './utils/formatters';
import { 
  CheckCircle, 
  RotateCcw, 
  Plus, 
  FileSpreadsheet, 
  Sparkles, 
  Shield 
} from 'lucide-react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch,
  type User as FirebaseUser 
} from './lib/firebase';
import { AuthModal } from './components/AuthModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';

const APP_STORAGE_VERSION = 'fincontrol_v2_zeroed';

// Se for primeira vez com a versão limpa, remove os dados de demonstração anteriores
if (typeof window !== 'undefined') {
  const currentVersion = localStorage.getItem('fincontrol_version');
  if (currentVersion !== APP_STORAGE_VERSION) {
    localStorage.removeItem('fincontrol_transactions');
    localStorage.removeItem('fincontrol_categories');
    localStorage.removeItem('fincontrol_accounts');
    localStorage.removeItem('fincontrol_goals');
    localStorage.setItem('fincontrol_version', APP_STORAGE_VERSION);
  }
}

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

  // Estado do mês ativo (YYYY-MM atual do sistema)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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

  // Autenticação e Nuvem
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Monitorar Firestore em tempo real quando o usuário estiver autenticado
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncing(true);
    const uid = currentUser.uid;

    // Escuta transações do usuário
    const qTx = query(collection(db, 'transactions'), where('userId', '==', uid));
    const unsubTx = onSnapshot(
      qTx,
      snapshot => {
        const cloudTxs: Transaction[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          cloudTxs.push({
            id: docSnap.id,
            description: data.description,
            amount: Number(data.amount) || 0,
            type: data.type,
            category: data.category,
            date: data.date,
            status: data.status,
            accountId: data.accountId,
            paymentMethod: data.paymentMethod,
            notes: data.notes || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        // Ordenar por data decrescente
        cloudTxs.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(cloudTxs);
        setIsSyncing(false);
      },
      error => {
        console.error('Erro ao sincronizar transações:', error);
        setIsSyncing(false);
      }
    );

    // Escuta contas do usuário
    const qAcc = query(collection(db, 'accounts'), where('userId', '==', uid));
    const unsubAcc = onSnapshot(
      qAcc,
      snapshot => {
        if (!snapshot.empty) {
          const cloudAccs: Account[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            cloudAccs.push({
              id: docSnap.id,
              name: data.name,
              institution: data.institution,
              type: data.type,
              balance: Number(data.balance) || 0,
              color: data.color,
              iconName: data.iconName,
            });
          });
          setAccounts(cloudAccs);
        } else {
          // Se na nuvem não existirem contas ainda para esse usuário, inicializa as contas padrão na nuvem
          INITIAL_ACCOUNTS.forEach(async acc => {
            await setDoc(doc(db, 'accounts', `${uid}_${acc.id}`), {
              ...acc,
              userId: uid,
            });
          });
        }
      },
      err => console.error('Erro ao sincronizar contas:', err)
    );

    // Escuta categorias
    const qCat = query(collection(db, 'categories'), where('userId', '==', uid));
    const unsubCat = onSnapshot(
      qCat,
      snapshot => {
        if (!snapshot.empty) {
          const cloudCats: Category[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            cloudCats.push({
              id: docSnap.id,
              name: data.name,
              type: data.type,
              color: data.color,
              iconName: data.iconName,
              budgetMonthly: Number(data.budgetMonthly) || 0,
            });
          });
          setCategories(cloudCats);
        } else {
          // Inicializa categorias padrão na nuvem
          INITIAL_CATEGORIES.forEach(async cat => {
            await setDoc(doc(db, 'categories', `${uid}_${cat.id}`), {
              ...cat,
              userId: uid,
            });
          });
        }
      },
      err => console.error('Erro ao sincronizar categorias:', err)
    );

    // Escuta metas financeiras
    const qGoals = query(collection(db, 'goals'), where('userId', '==', uid));
    const unsubGoals = onSnapshot(
      qGoals,
      snapshot => {
        const cloudGoals: FinancialGoal[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          cloudGoals.push({
            id: docSnap.id,
            title: data.title,
            targetAmount: Number(data.targetAmount) || 0,
            currentAmount: Number(data.currentAmount) || 0,
            deadline: data.deadline,
            category: data.category,
            color: data.color,
          });
        });
        setGoals(cloudGoals);
      },
      err => console.error('Erro ao sincronizar metas:', err)
    );

    return () => {
      unsubTx();
      unsubAcc();
      unsubCat();
      unsubGoals();
    };
  }, [currentUser]);

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

  const handleSaveTransaction = async (tx: Transaction) => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'transactions', tx.id), {
          ...tx,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao salvar no Firestore:', err);
      }
    }

    if (editingTransaction) {
      setTransactions(prev => prev.map(t => (t.id === tx.id ? tx : t)));
      showToast('Transação atualizada com sucesso!');
    } else {
      setTransactions(prev => [tx, ...prev]);
      showToast('Novo lançamento registrado com sucesso!');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      if (currentUser) {
        try {
          await deleteDoc(doc(db, 'transactions', id));
        } catch (err) {
          console.error('Erro ao excluir no Firestore:', err);
        }
      }
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Transação excluída');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const nextStatus = tx.status === 'paid' ? 'pending' : 'paid';

    if (currentUser) {
      try {
        await setDoc(doc(db, 'transactions', id), {
          ...tx,
          status: nextStatus,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao atualizar status no Firestore:', err);
      }
    }

    setTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
    showToast('Status da transação alterado');
  };

  // Ações em massa (Bulk actions)
  const handleBulkMarkPaid = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    if (currentUser) {
      try {
        const batch = writeBatch(db);
        ids.forEach(id => {
          const found = transactions.find(t => t.id === id);
          if (found) {
            batch.set(doc(db, 'transactions', id), {
              ...found,
              status: 'paid',
              userId: currentUser.uid,
            });
          }
        });
        await batch.commit();
      } catch (err) {
        console.error('Erro na atualização em massa:', err);
      }
    }

    setTransactions(prev =>
      prev.map(t => (idSet.has(t.id) ? { ...t, status: 'paid' as const } : t))
    );
    showToast(`${ids.length} ${ids.length === 1 ? 'lançamento marcado' : 'lançamentos marcados'} como pago!`);
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (confirm(`Atenção: deseja realmente excluir os ${ids.length} lançamentos selecionados?`)) {
      if (currentUser) {
        try {
          const batch = writeBatch(db);
          ids.forEach(id => {
            batch.delete(doc(db, 'transactions', id));
          });
          await batch.commit();
        } catch (err) {
          console.error('Erro na exclusão em massa:', err);
        }
      }
      const idSet = new Set(ids);
      setTransactions(prev => prev.filter(t => !idSet.has(t.id)));
      showToast(`${ids.length} ${ids.length === 1 ? 'lançamento excluído' : 'lançamentos excluídos'} com sucesso!`);
    }
  };

  const handleDuplicateTransaction = async (tx: Transaction) => {
    const duplicated: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      description: `${tx.description} (Cópia)`,
      createdAt: new Date().toISOString(),
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'transactions', duplicated.id), {
          ...duplicated,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao duplicar transação no Firestore:', err);
      }
    }

    setTransactions(prev => [duplicated, ...prev]);
    showToast('Transação duplicada!');
  };

  // Handlers para Categorias e Metas
  const handleUpdateCategoryBudget = async (catId: string, newBudget: number) => {
    const cat = categories.find(c => c.id === catId);
    if (cat && currentUser) {
      try {
        await setDoc(doc(db, 'categories', catId), {
          ...cat,
          budgetMonthly: newBudget,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao atualizar categoria no Firestore:', err);
      }
    }

    setCategories(prev =>
      prev.map(c => (c.id === catId ? { ...c, budgetMonthly: newBudget } : c))
    );
    showToast('Orçamento atualizado!');
  };

  const handleAddCategory = async (newCat: Category): Promise<Category> => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'categories', newCat.id), {
          ...newCat,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao salvar categoria no Firestore:', err);
      }
    }

    setCategories(prev => {
      const exists = prev.some(c => c.id === newCat.id);
      if (exists) {
        return prev.map(c => (c.id === newCat.id ? newCat : c));
      }
      return [...prev, newCat];
    });

    showToast(`Categoria "${newCat.name}" salva com sucesso!`);
    return newCat;
  };

  const handleDeleteCategory = async (catId: string): Promise<void> => {
    const cat = categories.find(c => c.id === catId);
    const catName = cat?.name || 'Categoria';

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'categories', catId));
        await deleteDoc(doc(db, 'categories', `${currentUser.uid}_${catId}`));
      } catch (err) {
        console.error('Erro ao deletar categoria no Firestore:', err);
      }
    }

    setCategories(prev => prev.filter(c => c.id !== catId && c.id !== `${currentUser?.uid}_${catId}`));
    showToast(`Categoria "${catName}" apagada com sucesso!`);
  };

  const handleAddGoal = async (goal: FinancialGoal) => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'goals', goal.id), {
          ...goal,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao salvar meta no Firestore:', err);
      }
    }

    setGoals(prev => [...prev, goal]);
    showToast('Nova meta financeira criada!');
  };

  const handleUpdateGoalAmount = async (goalId: string, addAmount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal && currentUser) {
      try {
        await setDoc(doc(db, 'goals', goalId), {
          ...goal,
          currentAmount: goal.currentAmount + addAmount,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao atualizar meta no Firestore:', err);
      }
    }

    setGoals(prev =>
      prev.map(g =>
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + addAmount } : g
      )
    );
    showToast(`Aporte de ${formatCurrency(addAmount)} adicionado à meta!`);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'goals', goalId));
      } catch (err) {
        console.error('Erro ao remover meta no Firestore:', err);
      }
    }
    setGoals(prev => prev.filter(g => g.id !== goalId));
    showToast('Meta removida');
  };

  // Handlers para Contas
  const handleAddAccount = async (acc: Account) => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'accounts', acc.id), {
          ...acc,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao salvar conta no Firestore:', err);
      }
    }
    setAccounts(prev => [...prev, acc]);
    showToast('Conta adicionada com sucesso!');
  };

  const handleDeleteAccount = async (accId: string) => {
    const accountToDelete = accounts.find(a => a.id === accId);
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'accounts', accId));
      } catch (err) {
        console.error('Erro ao excluir conta no Firestore:', err);
      }
    }
    setAccounts(prev => prev.filter(a => a.id !== accId));
    showToast(`Conta "${accountToDelete?.name || 'selecionada'}" removida com sucesso!`);
  };

  const handleUpdateBalance = async (accId: string, newBalance: number) => {
    const acc = accounts.find(a => a.id === accId);
    if (acc && currentUser) {
      try {
        await setDoc(doc(db, 'accounts', accId), {
          ...acc,
          balance: newBalance,
          userId: currentUser.uid,
        });
      } catch (err) {
        console.error('Erro ao atualizar saldo no Firestore:', err);
      }
    }
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

  // Reset para dados zerados
  const handleResetData = () => {
    if (confirm('Atenção: deseja zerar todos os lançamentos, saldos e metas para reiniciar o aplicativo do zero?')) {
      localStorage.removeItem('fincontrol_transactions');
      localStorage.removeItem('fincontrol_categories');
      localStorage.removeItem('fincontrol_accounts');
      localStorage.removeItem('fincontrol_goals');
      localStorage.setItem('fincontrol_version', APP_STORAGE_VERSION);
      setTransactions(INITIAL_TRANSACTIONS);
      setCategories(INITIAL_CATEGORIES);
      setAccounts(INITIAL_ACCOUNTS);
      setGoals(INITIAL_GOALS);
      showToast('Todos os valores foram zerados! O app está pronto para seu uso.');
    }
  };

  // Redirecionamento da categoria para a aba de transações
  const handleSelectCategoryFromDonut = (catId: string) => {
    setSelectedCategoryFilter(catId);
    setActiveTab('transactions');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Offline Status Badge */}
      <OfflineIndicator />

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
        onOpenMonthlyReport={() => setIsReportModalOpen(true)}
        transactionsCount={transactions.length}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isSyncing={isSyncing}
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
                  onDeleteAccount={handleDeleteAccount}
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
              onBulkDelete={handleBulkDelete}
              onBulkMarkPaid={handleBulkMarkPaid}
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
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
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
              onOpenMonthlyReport={() => setIsReportModalOpen(true)}
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
              onClick={() => setIsReportModalOpen(true)}
              className="hover:text-lime-400 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              title="Gerar e exportar resumo mensal em PDF formatado"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-lime-400" />
              <span>Resumo em PDF</span>
            </button>
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
              title="Zerar todos os lançamentos e valores do aplicativo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Dados</span>
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
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Modal de Autenticação e Sincronização em Nuvem */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={currentUser}
        onSuccessToast={showToast}
      />

      {/* Modal de Exportação do Resumo Mensal em PDF */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentMonth={currentMonth}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        goals={goals}
        userEmail={currentUser?.email}
        onToast={showToast}
      />
    </div>
  );
}
