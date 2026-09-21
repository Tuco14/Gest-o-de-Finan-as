import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Tag, 
  Wallet, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Transaction, Category, Account, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { generateId } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  categories: Category[];
  accounts: Account[];
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  currentMonth: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  editingTransaction,
  initialType = 'expense',
  currentMonth,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');
  const [status, setStatus] = useState<TransactionStatus>('paid');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or fill form when opening
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.category);
      setAccountId(editingTransaction.accountId);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setStatus(editingTransaction.status);
      setNotes(editingTransaction.notes || '');
      setErrors({});
    } else {
      setType(initialType);
      setDescription('');
      setAmount('');
      
      // Select first category of this type
      const defaultCat = categories.find(c => c.type === initialType || c.type === 'both');
      setCategoryId(defaultCat ? defaultCat.id : categories[0]?.id || '');
      
      setAccountId(accounts[0]?.id || '');
      
      // Default date to today or within current month
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setDate(localToday.startsWith(currentMonth) ? localToday : `${currentMonth}-01`);
      setPaymentMethod('Pix');
      setStatus('paid');
      setNotes('');
      setErrors({});
    }
  }, [isOpen, editingTransaction, initialType, currentMonth, categories, accounts]);

  if (!isOpen) return null;

  // Filtrar categorias aplicáveis
  const filteredCategories = categories.filter(
    c => c.type === type || c.type === 'both'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Informe um valor válido maior que zero';
    }

    if (!description.trim()) {
      newErrors.description = 'Informe a descrição do lançamento';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Selecione uma categoria';
    }

    if (!date) {
      newErrors.date = 'Informe a data';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const transactionData: Transaction = {
      id: editingTransaction ? editingTransaction.id : `tx-${generateId()}`,
      description: description.trim(),
      amount: numAmount,
      type,
      category: categoryId,
      date,
      status,
      accountId: accountId || accounts[0]?.id || 'acc-nubank',
      paymentMethod,
      notes: notes.trim() || undefined,
      createdAt: editingTransaction ? editingTransaction.createdAt : new Date().toISOString(),
    };

    onSave(transactionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="transaction-modal"
        className="bg-zinc-900 rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header do Modal */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
              type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
              {type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-white">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Alternador de Tipo (Receita / Despesa) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-800/80 rounded-2xl border border-zinc-700/80">
            <button
              type="button"
              id="type-expense-btn"
              onClick={() => {
                setType('expense');
                const cat = categories.find(c => c.type === 'expense');
                if (cat) setCategoryId(cat.id);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              id="type-income-btn"
              onClick={() => {
                setType('income');
                const cat = categories.find(c => c.type === 'income');
                if (cat) setCategoryId(cat.id);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-lime-400/20 text-lime-400 border border-lime-400/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receita</span>
            </button>
          </div>

          {/* Campo de Valor */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
              Valor (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-lg">
                R$
              </span>
              <input
                id="transaction-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                }}
                className={`w-full pl-12 pr-4 py-3 bg-zinc-800/90 border rounded-2xl text-xl font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 transition-all ${
                  errors.amount ? 'border-rose-500 bg-rose-950/30' : 'border-zinc-700'
                }`}
                autoFocus
              />
            </div>
            {errors.amount && <p className="text-rose-400 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
              Descrição *
            </label>
            <input
              id="transaction-description-input"
              type="text"
              placeholder="Ex: Supermercado, Salário, Conta de Luz..."
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              className={`w-full px-4 py-2.5 bg-zinc-800/90 border rounded-xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 transition-all ${
                errors.description ? 'border-rose-500 bg-rose-950/30' : 'border-zinc-700'
              }`}
            />
            {errors.description && <p className="text-rose-400 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Categoria e Data em 2 colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span>Categoria *</span>
              </label>
              <select
                id="transaction-category-select"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 cursor-pointer"
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Data *</span>
              </label>
              <input
                id="transaction-date-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Conta e Método de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                <span>Conta / Carteira</span>
              </label>
              <select
                id="transaction-account-select"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                <span>Método de Pagamento</span>
              </label>
              <select
                id="transaction-payment-method-select"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400 cursor-pointer"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          {/* Status do Lançamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
              Status da Transação
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                id="status-paid-btn"
                onClick={() => setStatus('paid')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  status === 'paid'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{type === 'income' ? 'Já Recebido' : 'Já Pago'}</span>
              </button>
              <button
                type="button"
                id="status-pending-btn"
                onClick={() => setStatus('pending')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  status === 'pending'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pendente / Agendado</span>
              </button>
            </div>
          </div>

          {/* Observações / Notas */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Observações (Opcional)</span>
            </label>
            <input
              id="transaction-notes-input"
              type="text"
              placeholder="Ex: Parcela 1 de 3, reembolsável pela empresa..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-lime-400/20 focus:border-lime-400"
            />
          </div>

          {/* Footer Ações: Botão principal em Verde Limão Amarelado */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              id="cancel-modal-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="save-transaction-btn"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-lime-400 hover:bg-lime-300 shadow-md shadow-lime-400/20 transition-all cursor-pointer active:scale-98"
            >
              {editingTransaction ? 'Atualizar Transação' : 'Salvar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
