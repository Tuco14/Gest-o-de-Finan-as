import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  Category, 
  Account, 
  TransactionType, 
  TransactionStatus 
} from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Plus, 
  SlidersHorizontal,
  X,
  ListChecks,
  CheckCheck
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  privacyMode: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDuplicate: (tx: Transaction) => void;
  onOpenNew: (type?: TransactionType) => void;
  selectedCategoryFilter?: string;
  onClearCategoryFilter?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMarkPaid?: (ids: string[]) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  accounts,
  privacyMode,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onOpenNew,
  selectedCategoryFilter,
  onClearCategoryFilter,
  onBulkDelete,
  onBulkMarkPaid,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [catFilter, setCatFilter] = useState<string>(selectedCategoryFilter || 'all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync category filter if prop changes
  React.useEffect(() => {
    if (selectedCategoryFilter) {
      setCatFilter(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Filtragem e ordenação
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        // Search term
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(s);
          const matchNotes = tx.notes?.toLowerCase().includes(s);
          const matchCat = categoryMap.get(tx.category)?.name.toLowerCase().includes(s);
          if (!matchDesc && !matchNotes && !matchCat) return false;
        }
        // Type
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        // Category
        if (catFilter !== 'all' && tx.category !== catFilter) return false;
        // Account
        if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;
        // Status
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, searchTerm, typeFilter, catFilter, accountFilter, statusFilter, sortBy, categoryMap]);

  // Totais do filtro ativo
  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const hasActiveFilters = searchTerm !== '' || typeFilter !== 'all' || catFilter !== 'all' || accountFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCatFilter('all');
    setAccountFilter('all');
    setStatusFilter('all');
    onClearCategoryFilter?.();
  };

  // Funções para Ações em Massa
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedIds.has(tx.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredTransactions.forEach(tx => next.delete(tx.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredTransactions.forEach(tx => next.add(tx.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkPaidAction = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onBulkMarkPaid) {
      onBulkMarkPaid(ids);
    } else {
      ids.forEach(id => onToggleStatus(id));
    }
    setSelectedIds(new Set());
  };

  const handleBulkDeleteAction = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onBulkDelete) {
      onBulkDelete(ids);
    } else {
      if (confirm(`Deseja realmente excluir ${ids.length} transações selecionadas?`)) {
        ids.forEach(id => onDelete(id));
      }
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="transaction-list-container space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Busca por texto */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-transactions-input"
              type="text"
              placeholder="Buscar por descrição, anotação..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/90 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros em Linha + Botão Ações em Massa */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Botão Ações em Massa */}
            <button
              id="bulk-actions-btn"
              onClick={() => {
                const next = !isBulkMode;
                setIsBulkMode(next);
                if (!next) setSelectedIds(new Set());
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBulkMode
                  ? 'bg-lime-400 text-zinc-950 border-lime-400 shadow-sm shadow-lime-400/20'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750 hover:text-white'
              }`}
              title="Ativar seleção múltipla para marcar como pagas ou excluir de uma vez"
            >
              <ListChecks className="w-4 h-4" />
              <span>Ações em Massa</span>
              {selectedIds.size > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isBulkMode ? 'bg-zinc-950 text-lime-400' : 'bg-lime-400 text-zinc-950'
                }`}>
                  {selectedIds.size}
                </span>
              )}
            </button>

            {/* Tipo */}
            <select
              id="filter-type-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 focus:outline-hidden focus:border-lime-400 cursor-pointer"
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas (+)</option>
              <option value="expense">Despesas (-)</option>
            </select>

            {/* Categoria */}
            <select
              id="filter-category-select"
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 focus:outline-hidden focus:border-lime-400 max-w-[160px] truncate cursor-pointer"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 focus:outline-hidden focus:border-lime-400 cursor-pointer"
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago / Recebido</option>
              <option value="pending">Pendente</option>
            </select>

            {/* Ordenação */}
            <select
              id="filter-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 focus:outline-hidden focus:border-lime-400 cursor-pointer"
            >
              <option value="date-desc">Data (Mais recente)</option>
              <option value="date-asc">Data (Mais antigo)</option>
              <option value="amount-desc">Maior valor</option>
              <option value="amount-asc">Menor valor</option>
            </select>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                id="reset-filters-btn"
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                title="Limpar todos os filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Ações em Massa (visível quando ativada) */}
        {isBulkMode && (
          <div
            id="bulk-actions-toolbar"
            className="p-3 bg-zinc-850 border border-lime-400/30 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
                />
                <span>Selecionar Todos ({filteredTransactions.length})</span>
              </label>

              <span className="text-xs text-zinc-400">
                • <strong className="text-lime-400">{selectedIds.size}</strong> selecionado(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="bulk-mark-paid-btn"
                onClick={handleBulkMarkPaidAction}
                disabled={selectedIds.size === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedIds.size > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-zinc-800/60 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                }`}
                title="Marcar transações selecionadas como pagas"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Marcar como Pagas ({selectedIds.size})</span>
              </button>

              <button
                id="bulk-delete-btn"
                onClick={handleBulkDeleteAction}
                disabled={selectedIds.size === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedIds.size > 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-zinc-800/60 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                }`}
                title="Excluir transações selecionadas de uma só vez"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Excluir Selecionadas ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => {
                  setIsBulkMode(false);
                  setSelectedIds(new Set());
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer ml-1"
                title="Fechar modo de ações em massa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Resumo dos registros filtrados */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-zinc-800 text-zinc-400">
          <div>
            Mostrando <span className="font-bold text-white">{filteredTransactions.length}</span> lançamentos
          </div>
          <div className="flex items-center gap-3">
            <span>
              Entradas: <strong className="text-emerald-400">{formatCurrency(filteredTotals.income, privacyMode)}</strong>
            </span>
            <span>
              Saídas: <strong className="text-rose-400">{formatCurrency(filteredTotals.expense, privacyMode)}</strong>
            </span>
            <span>
              Saldo: <strong className={filteredTotals.balance >= 0 ? 'text-lime-400' : 'text-rose-400'}>
                {formatCurrency(filteredTotals.balance, privacyMode)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-12 border border-zinc-800 shadow-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-white text-base">Nenhum lançamento encontrado</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Não há transações que correspondam aos filtros selecionados para este período.
          </p>
          <div className="flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
            <button
              onClick={() => onOpenNew()}
              className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 rounded-xl text-xs font-bold shadow-md shadow-lime-400/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-850/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  {isBulkMode && (
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
                        title="Selecionar todos os lançamentos"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4">Lançamento</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Conta / Método</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs">
                {filteredTransactions.map(tx => {
                  const cat = categoryMap.get(tx.category);
                  const acc = accountMap.get(tx.accountId);
                  const isExpense = tx.type === 'expense';
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      onClick={isBulkMode ? () => toggleSelect(tx.id) : undefined}
                      className={`hover:bg-zinc-800/50 transition-colors group ${
                        isBulkMode ? 'cursor-pointer' : ''
                      } ${
                        isBulkMode && isSelected
                          ? 'bg-lime-400/10 hover:bg-lime-400/15 ring-1 ring-inset ring-lime-400/30'
                          : ''
                      }`}
                    >
                      {/* Checkbox de Seleção em Massa */}
                      {isBulkMode && (
                        <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(tx.id)}
                            className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Descrição & Ícone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: cat?.color || (isExpense ? '#F43F5E' : '#10B981') }}
                          >
                            <CategoryIcon name={cat?.iconName || (isExpense ? 'ArrowDownLeft' : 'ArrowUpRight')} className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-white block group-hover:text-lime-400 transition-colors">
                              {tx.description}
                            </span>
                            {tx.notes && (
                              <span className="text-[11px] text-zinc-400 block truncate max-w-xs">
                                {tx.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat?.color || '#94A3B8' }}
                          />
                          <span>{cat?.name || 'Sem categoria'}</span>
                        </span>
                      </td>

                      {/* Conta e Pagamento */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300">
                        <div className="font-medium text-white">{acc?.name || 'Conta Digital'}</div>
                        <div className="text-[11px] text-zinc-400">{tx.paymentMethod}</div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300 font-medium">
                        {formatDateBR(tx.date)}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          id={`toggle-status-${tx.id}`}
                          onClick={() => onToggleStatus(tx.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                            tx.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                          }`}
                          title="Clique para alternar entre Pago e Pendente"
                        >
                          {tx.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{isExpense ? 'Pago' : 'Recebido'}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <span className={`font-bold text-sm ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isExpense ? '-' : '+'} {formatCurrency(tx.amount, privacyMode)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap relative">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`edit-tx-${tx.id}`}
                            onClick={() => onEdit(tx)}
                            className="p-1.5 text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`dup-tx-${tx.id}`}
                            onClick={() => onDuplicate(tx)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Duplicar lançamento"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            id={`del-tx-${tx.id}`}
                            onClick={() => onDelete(tx.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
