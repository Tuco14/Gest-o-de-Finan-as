import React, { useState, useMemo } from 'react';
import { Category, Transaction, FinancialGoal, TransactionType } from '../types';
import { formatCurrency, formatDateBR, generateId } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { 
  Target, 
  PiggyBank, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  X,
  Layers
} from 'lucide-react';

interface BudgetsViewProps {
  categories: Category[];
  transactions: Transaction[];
  goals: FinancialGoal[];
  currentMonth: string;
  privacyMode: boolean;
  onUpdateCategoryBudget: (categoryId: string, newBudget: number) => void;
  onAddGoal: (goal: FinancialGoal) => void;
  onUpdateGoalAmount: (goalId: string, addAmount: number) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddCategory?: (category: Category) => Promise<Category> | void;
  onDeleteCategory?: (categoryId: string) => Promise<void> | void;
}

const CATEGORY_COLORS = [
  '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6', 
  '#8B5CF6', '#06B6D4', '#F97316', '#EF4444', '#64748B'
];

const CATEGORY_ICONS = [
  'Tag', 'Utensils', 'Car', 'Home', 'HeartPulse', 
  'Sparkles', 'GraduationCap', 'Tv', 'Briefcase', 
  'Laptop', 'TrendingUp', 'CircleDollarSign', 'Wallet', 'CreditCard'
];

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  categories,
  transactions,
  goals,
  currentMonth,
  privacyMode,
  onUpdateCategoryBudget,
  onAddGoal,
  onUpdateGoalAmount,
  onDeleteGoal,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [editingBudgetCatId, setEditingBudgetCatId] = useState<string | null>(null);
  const [tempBudgetVal, setTempBudgetVal] = useState<string>('');
  
  // Estado para criar nova categoria
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType | 'both'>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');

  // Estado para novo objetivo
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Reserva');

  // Estado para modal/prompt de aporte em meta
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState<string>('');

  // Gastos do mês por categoria
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(currentMonth)) {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });
    return map;
  }, [transactions, currentMonth]);

  // Lista de categorias com orçamento definido
  const budgetCategories = useMemo(() => {
    return categories
      .filter(c => c.type === 'expense' || c.type === 'both')
      .map(cat => {
        const spent = categorySpentMap[cat.id] || 0;
        const budget = cat.budgetMonthly || 0;
        const percent = budget > 0 ? (spent / budget) * 100 : 0;
        const remaining = budget - spent;
        return {
          ...cat,
          spent,
          budget,
          percent,
          remaining,
        };
      })
      .sort((a, b) => b.budget - a.budget);
  }, [categories, categorySpentMap]);

  // Totais consolidados de orçamento
  const totals = useMemo(() => {
    let totalBudget = 0;
    let totalSpent = 0;
    budgetCategories.forEach(c => {
      totalBudget += c.budget;
      totalSpent += c.spent;
    });
    return {
      totalBudget,
      totalSpent,
      percent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      remaining: totalBudget - totalSpent,
    };
  }, [budgetCategories]);

  const handleSaveBudget = (catId: string) => {
    const num = parseFloat(tempBudgetVal.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      onUpdateCategoryBudget(catId, num);
    }
    setEditingBudgetCatId(null);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget.replace(',', '.'));
    const current = parseFloat(newGoalCurrent.replace(',', '.')) || 0;
    if (!newGoalTitle.trim() || isNaN(target) || target <= 0) return;

    const newGoal: FinancialGoal = {
      id: `goal-${generateId()}`,
      title: newGoalTitle.trim(),
      targetAmount: target,
      currentAmount: current,
      deadline: newGoalDeadline || '2026-12-31',
      category: newGoalCategory,
      color: '#6366F1',
    };

    onAddGoal(newGoal);
    setIsAddingGoal(false);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setNewGoalDeadline('');
  };

  const handleContribute = (goalId: string) => {
    const num = parseFloat(contributeAmount.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      onUpdateGoalAmount(goalId, num);
    }
    setContributeGoalId(null);
    setContributeAmount('');
  };

  // Handlers para Categorias
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;

    const numBudget = parseFloat(newCatBudget.replace(',', '.'));
    const cat: Category = {
      id: `cat-${generateId()}`,
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      iconName: newCatIcon,
      budgetMonthly: !isNaN(numBudget) && numBudget > 0 ? numBudget : 0,
    };

    await onAddCategory(cat);
    setIsAddingCategory(false);
    setNewCatName('');
    setNewCatBudget('');
  };

  const handleDeleteCategoryPrompt = async (catId: string, catName: string) => {
    if (!onDeleteCategory) return;
    if (confirm(`Deseja realmente apagar a categoria "${catName}"?`)) {
      await onDeleteCategory(catId);
    }
  };

  // Categorias de receita
  const incomeCategories = useMemo(() => {
    return categories.filter(c => c.type === 'income' || c.type === 'both');
  }, [categories]);

  return (
    <div className="space-y-8">
      {/* Seção 1: Resumo do Orçamento Mensal & Categorias */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-lime-400" />
              <h3 className="font-bold text-white text-lg">Categorias & Orçamento Mensal</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Crie, personalize ou apague categorias fixas e gerencie tetos de gastos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onAddCategory && (
              <button
                type="button"
                id="add-category-budget-btn"
                onClick={() => setIsAddingCategory(true)}
                className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-lime-400/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Categoria</span>
              </button>
            )}
            <div className="text-right pl-3 border-l border-zinc-800">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                Utilização Geral
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatCurrency(totals.totalSpent, privacyMode)} / {formatCurrency(totals.totalBudget, privacyMode)}
              </div>
            </div>
          </div>
        </div>

        {/* Formulário para Nova Categoria */}
        {isAddingCategory && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-850 border border-lime-400/40 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-750 pb-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-lime-400" />
                <h4 className="text-sm font-bold text-white">Criar Nova Categoria Fixa</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Farmácia, Pet Shop, Cursos..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-lime-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase mb-1">
                    Tipo
                  </label>
                  <select
                    value={newCatType}
                    onChange={e => setNewCatType(e.target.value as TransactionType | 'both')}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="both">Ambos (Receita & Despesa)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newCatType !== 'income' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase mb-1">
                      Limite de Gastos Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00 (opcional)"
                      value={newCatBudget}
                      onChange={e => setNewCatBudget(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-lime-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase mb-1">
                    Ícone
                  </label>
                  <select
                    value={newCatIcon}
                    onChange={e => setNewCatIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white focus:outline-hidden"
                  >
                    {CATEGORY_ICONS.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase mb-1.5">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORY_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        newCatColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-750">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Salvar Categoria Fixa
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Abas para alternar entre Despesas e Receitas */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-800/80 rounded-xl border border-zinc-700/60">
            <button
              onClick={() => setCategoryTab('expense')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                categoryTab === 'expense' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Categorias de Despesa ({budgetCategories.length})
            </button>
            <button
              onClick={() => setCategoryTab('income')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                categoryTab === 'income' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Categorias de Receita ({incomeCategories.length})
            </button>
          </div>
        </div>

        {/* Barra Geral de Despesas (Apenas na aba de despesas) */}
        {categoryTab === 'expense' && (
          <div className="space-y-1.5 mb-8">
            <div className="flex justify-between text-xs font-medium text-zinc-300">
              <span>Consumo consolidado: {totals.percent.toFixed(1)}%</span>
              <span>
                {totals.remaining >= 0 ? (
                  <strong className="text-lime-400 font-semibold">
                    Restante: {formatCurrency(totals.remaining, privacyMode)}
                  </strong>
                ) : (
                  <strong className="text-rose-400 font-semibold">
                    Excedido em: {formatCurrency(Math.abs(totals.remaining), privacyMode)}
                  </strong>
                )}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totals.percent >= 100
                    ? 'bg-rose-500'
                    : totals.percent >= 80
                    ? 'bg-amber-400'
                    : 'bg-lime-400'
                }`}
                style={{ width: `${Math.min(100, totals.percent)}%` }}
              />
            </div>
          </div>
        )}

        {/* Grade de Categorias de Despesa */}
        {categoryTab === 'expense' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetCategories.length === 0 ? (
              <div className="col-span-2 py-8 text-center bg-zinc-850/50 rounded-2xl border border-dashed border-zinc-800">
                <Tag className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-300">Nenhuma categoria de despesa cadastrada</p>
                <p className="text-xs text-zinc-500 mt-0.5">Adicione sua primeira categoria para organizar seu orçamento</p>
                {onAddCategory && (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="mt-3 px-4 py-2 bg-lime-400 text-zinc-950 font-bold text-xs rounded-xl"
                  >
                    + Criar Categoria
                  </button>
                )}
              </div>
            ) : (
              budgetCategories.map(cat => {
                const isExceeded = cat.percent >= 100;
                const isNearLimit = cat.percent >= 80 && !isExceeded;
                const isEditing = editingBudgetCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isExceeded
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : isNearLimit
                        ? 'border-amber-500/40 bg-amber-950/20'
                        : 'border-zinc-800 bg-zinc-850/60 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        >
                          <CategoryIcon name={cat.iconName} className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="font-semibold text-white text-xs truncate">{cat.name}</h4>
                          <span className="text-[11px] text-zinc-400">
                            {cat.budget === 0 ? (
                              <span className="text-zinc-500">Sem teto estabelecido</span>
                            ) : isExceeded ? (
                              <span className="text-rose-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Limite excedido!
                              </span>
                            ) : isNearLimit ? (
                              <span className="text-amber-400 font-medium">Atenção ao limite</span>
                            ) : (
                              <span className="text-zinc-400">Dentro da meta</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Ações: Edição rápida de limite e Apagar categoria */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={tempBudgetVal}
                                onChange={e => setTempBudgetVal(e.target.value)}
                                className="w-20 px-2 py-1 bg-zinc-900 border border-lime-400 rounded-lg text-xs font-bold text-white focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveBudget(cat.id)}
                                className="px-2 py-1 bg-lime-400 text-zinc-950 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingBudgetCatId(cat.id);
                                setTempBudgetVal(cat.budget.toString());
                              }}
                              className="flex items-center gap-1 text-zinc-400 hover:text-lime-400 text-xs font-medium cursor-pointer"
                              title="Alterar limite mensal"
                            >
                              <span className="font-bold text-white">
                                {formatCurrency(cat.budget, privacyMode)}
                              </span>
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {onDeleteCategory && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategoryPrompt(cat.id, cat.name)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title={`Apagar categoria "${cat.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de progresso da categoria */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded ? 'bg-rose-500' : isNearLimit ? 'bg-amber-400' : 'bg-lime-400'
                        }`}
                        style={{ width: `${Math.min(100, cat.percent)}%` }}
                      />
                    </div>

                    {/* Subinfo da categoria */}
                    <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                      <span>Gasto: {formatCurrency(cat.spent, privacyMode)}</span>
                      {cat.budget === 0 ? (
                        <span className="text-zinc-500 italic">Clique no valor para definir teto</span>
                      ) : (
                        <>
                          <span>{cat.percent.toFixed(0)}% utilizado</span>
                          <span>
                            {cat.remaining >= 0
                              ? `Resta ${formatCurrency(cat.remaining, privacyMode)}`
                              : `Passou ${formatCurrency(Math.abs(cat.remaining), privacyMode)}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Grade de Categorias de Receita */}
        {categoryTab === 'income' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {incomeCategories.length === 0 ? (
              <div className="col-span-3 py-8 text-center bg-zinc-850/50 rounded-2xl border border-dashed border-zinc-800">
                <Tag className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-300">Nenhuma categoria de receita cadastrada</p>
                <p className="text-xs text-zinc-500 mt-0.5">Crie categorias para organizar seus salários, freelances e lucros</p>
                {onAddCategory && (
                  <button
                    onClick={() => {
                      setNewCatType('income');
                      setIsAddingCategory(true);
                    }}
                    className="mt-3 px-4 py-2 bg-lime-400 text-zinc-950 font-bold text-xs rounded-xl"
                  >
                    + Criar Categoria de Receita
                  </button>
                )}
              </div>
            ) : (
              incomeCategories.map(cat => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-850/60 hover:bg-zinc-800/80 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.iconName} className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-semibold text-white text-xs truncate">{cat.name}</h4>
                      <span className="text-[10px] text-zinc-500">
                        {cat.type === 'both' ? 'Receita & Despesa' : 'Receita'}
                      </span>
                    </div>
                  </div>

                  {onDeleteCategory && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategoryPrompt(cat.id, cat.name)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Apagar categoria "${cat.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Seção 2: Metas Financeiras (Poupanca / Sonhos) */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-lime-400" />
              <h3 className="font-bold text-white text-lg">Metas de Poupança & Objetivos</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Acompanhe o progresso dos seus sonhos e reservas financeiras
            </p>
          </div>
          <button
            id="add-goal-btn"
            onClick={() => setIsAddingGoal(!isAddingGoal)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 rounded-xl text-xs font-bold shadow-md shadow-lime-400/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Meta</span>
          </button>
        </div>

        {/* Formulário para adicionar nova meta */}
        {isAddingGoal && (
          <form
            onSubmit={handleCreateGoal}
            className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700 mb-6 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold text-lime-400 uppercase tracking-wide">
              Cadastrar Novo Objetivo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Título da Meta *</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de Carro, Reforma..."
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Valor Alvo (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 20000"
                  value={newGoalTarget}
                  onChange={e => setNewGoalTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Valor Atual Guardado</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5000"
                  value={newGoalCurrent}
                  onChange={e => setNewGoalCurrent(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Data Estimada</label>
                <input
                  type="date"
                  value={newGoalDeadline}
                  onChange={e => setNewGoalDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-lime-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        )}

        {/* Modal/Prompt de Aporte Rápido */}
        {contributeGoalId && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-sm shadow-xl border border-zinc-700">
              <h4 className="font-bold text-white text-sm mb-1">Aportar na Meta</h4>
              <p className="text-xs text-zinc-400 mb-4">
                Informe o valor que você está guardando para este objetivo hoje:
              </p>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={contributeAmount}
                  onChange={e => setContributeAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-base font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setContributeGoalId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleContribute(contributeGoalId)}
                  className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Confirmar Aporte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Metas */}
        {goals.length === 0 ? (
          <div className="text-center py-10 px-4 bg-zinc-850/40 border border-dashed border-zinc-800 rounded-2xl">
            <Sparkles className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <h4 className="font-bold text-white text-sm">Nenhuma meta financeira cadastrada</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Defina metas para reserva de emergência, viagens, novos equipamentos ou sonhos financeiros.
            </p>
            <button
              onClick={() => setIsAddingGoal(true)}
              className="mt-3 px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Criar Primeira Meta</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {goals.map(goal => {
              const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isCompleted = percent >= 100;

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-850/60 flex flex-col justify-between hover:border-zinc-700 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-lime-400 border border-zinc-700">
                          {goal.category}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1.5">{goal.title}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Prazo: {formatDateBR(goal.deadline)}</p>
                      </div>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Excluir meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="my-4">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">
                          {formatCurrency(goal.currentAmount, privacyMode)}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          de {formatCurrency(goal.targetAmount, privacyMode)}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-400' : 'bg-lime-400'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] font-bold text-zinc-400 mt-1">
                        {percent.toFixed(1)}% concluído
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    {isCompleted ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Meta Conquistada!
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        Falta {formatCurrency(goal.targetAmount - goal.currentAmount, privacyMode)}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setContributeGoalId(goal.id);
                        setContributeAmount('');
                      }}
                      className="px-3 py-1.5 bg-lime-400/10 border border-lime-400/30 hover:bg-lime-400 hover:text-zinc-950 text-lime-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      + Aportar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
