import React, { useState, useMemo } from 'react';
import { PayableBill, Category } from '../types';
import { formatCurrency, generateId } from '../utils/formatters';
import { 
  CreditCard, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Search, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Receipt,
  FileCheck,
  ChevronRight,
  X
} from 'lucide-react';

interface BillsViewProps {
  bills: PayableBill[];
  categories: Category[];
  privacyMode: boolean;
  currentMonth: string;
  onAddBill: (bill: PayableBill) => void;
  onUpdateBill: (bill: PayableBill) => void;
  onDeleteBill: (id: string) => void;
  onPayInstallment: (id: string) => void;
  onRevertInstallment: (id: string) => void;
  onPayoffBill: (id: string) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  categories,
  privacyMode,
  currentMonth,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onPayInstallment,
  onRevertInstallment,
  onPayoffBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'due-soon' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<PayableBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);
  const [billToPayoff, setBillToPayoff] = useState<PayableBill | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  // Abre modal para criar
  const handleOpenCreate = () => {
    setEditingBill(null);
    setName('');
    setInstallmentAmount('');
    setTotalInstallments('12');
    setPaidInstallments('0');
    setCategory(categories[0]?.id || '');
    setNotes('');
    const today = new Date();
    setDueDate(today.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  // Abre modal para editar
  const handleOpenEdit = (bill: PayableBill) => {
    setEditingBill(bill);
    setName(bill.name);
    setInstallmentAmount(bill.installmentAmount.toString());
    setTotalInstallments(bill.totalInstallments.toString());
    setPaidInstallments(bill.paidInstallments.toString());
    setDueDate(bill.dueDate);
    setCategory(bill.category || '');
    setNotes(bill.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(installmentAmount.replace(',', '.'));
    const totalInstNum = parseInt(totalInstallments, 10);
    const paidInstNum = parseInt(paidInstallments, 10) || 0;

    if (!name.trim() || isNaN(amountNum) || amountNum <= 0 || isNaN(totalInstNum) || totalInstNum <= 0) {
      return;
    }

    const billData: PayableBill = {
      id: editingBill ? editingBill.id : `bill-${generateId()}`,
      name: name.trim(),
      installmentAmount: amountNum,
      totalInstallments: totalInstNum,
      paidInstallments: Math.min(paidInstNum, totalInstNum),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      category: category || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingBill?.createdAt || new Date().toISOString(),
    };

    if (editingBill) {
      onUpdateBill(billData);
    } else {
      onAddBill(billData);
    }

    setIsModalOpen(false);
  };

  // Totais consolidados
  const metrics = useMemo(() => {
    let totalRemaining = 0;
    let totalPaid = 0;
    let totalContracted = 0;
    let pendingBillsCount = 0;
    let completedBillsCount = 0;

    bills.forEach(bill => {
      const remainingInstallments = Math.max(0, bill.totalInstallments - bill.paidInstallments);
      const remainingAmount = remainingInstallments * bill.installmentAmount;
      const paidAmount = bill.paidInstallments * bill.installmentAmount;

      totalRemaining += remainingAmount;
      totalPaid += paidAmount;
      totalContracted += bill.totalInstallments * bill.installmentAmount;

      if (remainingInstallments === 0) {
        completedBillsCount++;
      } else {
        pendingBillsCount++;
      }
    });

    const overallProgress = totalContracted > 0 ? (totalPaid / totalContracted) * 100 : 0;

    return {
      totalRemaining,
      totalPaid,
      totalContracted,
      pendingBillsCount,
      completedBillsCount,
      overallProgress,
    };
  }, [bills]);

  // Formata data de vencimento: "dia XX do mês de [Mês]"
  const formatDueDisplay = (dateStr: string) => {
    if (!dateStr) return 'Data não definida';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[parseInt(month, 10) - 1] || month;

    return `dia ${parseInt(day, 10)} de ${monthName}`;
  };

  // Status da parcela
  const getBillStatus = (bill: PayableBill) => {
    if (bill.paidInstallments >= bill.totalInstallments) {
      return { label: 'Quitada', color: 'text-lime-400 bg-lime-400/10 border-lime-400/30' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (bill.dueDate === todayStr) {
      return { label: 'Vence Hoje', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    }
    if (bill.dueDate < todayStr) {
      return { label: 'Vencida', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    return { label: 'Em Dia', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
  };

  // Filtragem
  const filteredBills = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return bills.filter(b => {
      // Busca
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesNotes = b.notes?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesNotes) return false;
      }

      // Status
      const isCompleted = b.paidInstallments >= b.totalInstallments;
      if (statusFilter === 'completed') return isCompleted;
      if (statusFilter === 'pending') return !isCompleted;
      if (statusFilter === 'due-soon') {
        return !isCompleted && b.dueDate <= todayStr;
      }

      return true;
    });
  }, [bills, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner com Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total que Falta Pagar */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-rose-400 tracking-wide uppercase">Falta Pagar (Total)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400 tracking-tight">
              {formatCurrency(metrics.totalRemaining, privacyMode)}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
              <span>{metrics.pendingBillsCount} {metrics.pendingBillsCount === 1 ? 'conta em aberto' : 'contas em aberto'}</span>
            </p>
          </div>
        </div>

        {/* Total Já Quitado */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-lime-400 tracking-wide uppercase">Total Já Quitado</span>
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(metrics.totalPaid, privacyMode)}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              <span>{metrics.completedBillsCount} {metrics.completedBillsCount === 1 ? 'conta totalmente quitada' : 'contas quitadas'}</span>
            </p>
          </div>
        </div>

        {/* Progresso Geral */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Progresso Geral</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-white tracking-tight">
                {metrics.overallProgress.toFixed(1)}%
              </div>
              <span className="text-xs font-medium text-zinc-400">
                de {formatCurrency(metrics.totalContracted, privacyMode)}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="h-full bg-lime-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics.overallProgress))}%` }}
              />
            </div>
          </div>
        </div>

        {/* CTA Nova Conta */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-dashed border-zinc-700/80 hover:border-lime-400/50 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Novo Compromisso</span>
            <div className="w-8 h-8 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-3">
              Cadastre financiamentos, parcelas de compras ou contas fixas para acompanhar a evolução.
            </p>
            <button
              onClick={handleOpenCreate}
              className="w-full py-2 px-3 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-lime-400/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar Conta a Pagar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar conta por nome..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({bills.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Em Aberto ({metrics.pendingBillsCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-lime-400/20 text-lime-300 font-bold border border-lime-400/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Quitadas ({metrics.completedBillsCount})
          </button>
        </div>
      </div>

      {/* Lista de Contas a Pagar */}
      {filteredBills.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-dashed border-zinc-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Nenhuma conta encontrada</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              {bills.length === 0
                ? 'Você ainda não cadastrou nenhuma conta ou parcelamento a pagar. Clique no botão abaixo para adicionar a primeira.'
                : 'Nenhum resultado corresponde aos filtros selecionados.'}
            </p>
          </div>
          {bills.length === 0 && (
            <button
              onClick={handleOpenCreate}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-lime-400/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Minha Primeira Conta</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map(bill => {
            const isCompleted = bill.paidInstallments >= bill.totalInstallments;
            const progress = (bill.paidInstallments / bill.totalInstallments) * 100;
            const remainingInstallments = Math.max(0, bill.totalInstallments - bill.paidInstallments);
            const remainingAmount = remainingInstallments * bill.installmentAmount;
            const totalPaidAmount = bill.paidInstallments * bill.installmentAmount;
            const totalContractedAmount = bill.totalInstallments * bill.installmentAmount;
            const status = getBillStatus(bill);
            const currentInstallmentDisplay = isCompleted 
              ? `${bill.totalInstallments}/${bill.totalInstallments}` 
              : `${String(bill.paidInstallments + 1).padStart(2, '0')}/${String(bill.totalInstallments).padStart(2, '0')}`;

            return (
              <div
                key={bill.id}
                className={`bg-zinc-900 rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isCompleted 
                    ? 'border-lime-400/30 bg-zinc-900/60' 
                    : 'border-zinc-800 hover:border-zinc-700 shadow-md'
                }`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm sm:text-base leading-tight">
                          {bill.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                        <span>Vencimento: <strong className="text-zinc-200">{formatDueDisplay(bill.dueDate)}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(bill)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Editar conta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillToDelete(bill)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Excluir conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Parcela e Valores */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl my-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-500">Parcela Atual</span>
                      <div className="font-bold text-white text-sm mt-0.5 flex items-baseline gap-1">
                        <span>{currentInstallmentDisplay}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          ({bill.paidInstallments} de {bill.totalInstallments} pagas)
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Valor: <strong className="text-zinc-200">{formatCurrency(bill.installmentAmount, privacyMode)}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-rose-400">Total que Falta Pagar</span>
                      <div className="font-bold text-rose-400 text-sm mt-0.5">
                        {formatCurrency(remainingAmount, privacyMode)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        Total: {formatCurrency(totalContractedAmount, privacyMode)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso de Pagamento */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-zinc-400">Progresso de Quitação</span>
                      <span className={`font-bold ${isCompleted ? 'text-lime-400' : 'text-zinc-200'}`}>
                        {progress.toFixed(0)}% concluído ({formatCurrency(totalPaidAmount, privacyMode)} pago)
                      </span>
                    </div>

                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-lime-400 shadow-xs shadow-lime-400/50' : 'bg-lime-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>

                  {bill.notes && (
                    <p className="text-[11px] text-zinc-400 italic mb-4 bg-zinc-800/40 p-2 rounded-lg">
                      "{bill.notes}"
                    </p>
                  )}
                </div>

                {/* Ações da Conta */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {bill.paidInstallments > 0 && (
                      <button
                        onClick={() => onRevertInstallment(bill.id)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Desfazer e voltar 1 parcela"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Voltar 1</span>
                      </button>
                    )}

                    {!isCompleted && remainingInstallments > 1 && (
                      <button
                        type="button"
                        onClick={() => setBillToPayoff(bill)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title="Quitar todas as parcelas restantes"
                      >
                        Quitar Tudo
                      </button>
                    )}
                  </div>

                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-lime-400 bg-lime-400/10 px-3 py-1.5 rounded-xl border border-lime-400/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Totalmente Paga!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onPayInstallment(bill.id)}
                      className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl shadow-md shadow-lime-400/20 hover:shadow-lime-400/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Pagar Parcela ({currentInstallmentDisplay})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Adicionar / Editar Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingBill ? 'Editar Conta a Pagar' : 'Cadastrar Conta a Pagar'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Preencha o valor da parcela, quantidade de vezes e o vencimento
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome da Conta / Compromisso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Financiamento Carro, Celular Parcelado, Aluguel"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Valor de Cada Parcela (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 350.00"
                    value={installmentAmount}
                    onChange={e => setInstallmentAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Total de Parcelas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    required
                    placeholder="Ex: 12"
                    value={totalInstallments}
                    onChange={e => setTotalInstallments(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Parcelas Já Pagas
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totalInstallments || '360'}
                    placeholder="0"
                    value={paidInstallments}
                    onChange={e => setPaidInstallments(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Se for nova, deixe 0.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Data do Próximo Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Anotações / Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Débito automático no banco ou pago via Pix..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                {editingBill ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDelete = editingBill;
                      setIsModalOpen(false);
                      setBillToDelete(toDelete);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Conta</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-lime-400/20"
                  >
                    {editingBill ? 'Salvar Alterações' : 'Cadastrar Conta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Conta a Pagar */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Excluir Conta a Pagar?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tem certeza que deseja excluir esta conta? Esta confirmação evita que você a exclua sem querer por engano. O histórico de parcelas e progresso serão removidos permanentemente.
                </p>
              </div>
            </div>

            {/* Informações detalhadas da conta a excluir */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white text-sm truncate">{billToDelete.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  Parcela {billToDelete.paidInstallments}/{billToDelete.totalInstallments}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-900 text-zinc-400 text-[11px]">
                <div>
                  <span>Valor da parcela:</span>
                  <strong className="block text-zinc-200 font-semibold mt-0.5">
                    {formatCurrency(billToDelete.installmentAmount, privacyMode)}
                  </strong>
                </div>
                <div>
                  <span>Total pendente:</span>
                  <strong className="block text-rose-400 font-semibold mt-0.5">
                    {formatCurrency(
                      Math.max(0, billToDelete.totalInstallments - billToDelete.paidInstallments) * billToDelete.installmentAmount,
                      privacyMode
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBill(billToDelete.id);
                  setBillToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-600/20 active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Quitar Tudo */}
      {billToPayoff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-lime-400/15 text-lime-400 border border-lime-400/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Quitar Todas as Parcelas?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deseja marcar todas as parcelas restantes da conta <strong className="text-white">"{billToPayoff.name}"</strong> como pagas? O progresso será concluído em 100%.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setBillToPayoff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onPayoffBill(billToPayoff.id);
                  setBillToPayoff(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-lime-400 hover:bg-lime-300 text-zinc-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-lime-400/20 active:scale-98"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Quitação</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
