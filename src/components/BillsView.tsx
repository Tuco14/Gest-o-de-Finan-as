import React, { useState, useMemo } from 'react';
import { PayableBill, Category } from '../types';
import { formatCurrency } from '../utils/formatters';
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
  X,
  Droplets,
  Zap,
  Smartphone,
  Wifi,
  Home,
  Tv,
  Check,
  HelpCircle,
  Filter,
  DollarSign
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
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

// Modelos pré-definidos para criação instantânea de contas fixas
interface FixedPreset {
  name: string;
  icon: string;
  defaultCategoryName: string;
  suggestedDay: number;
  description: string;
}

const FIXED_BILL_PRESETS: FixedPreset[] = [
  {
    name: 'Conta de Água',
    icon: 'Droplets',
    defaultCategoryName: 'Moradia & Contas',
    suggestedDay: 10,
    description: 'Água e saneamento básico',
  },
  {
    name: 'Conta de Luz',
    icon: 'Zap',
    defaultCategoryName: 'Moradia & Contas',
    suggestedDay: 15,
    description: 'Energia elétrica residencial',
  },
  {
    name: 'Plano de Celular',
    icon: 'Smartphone',
    defaultCategoryName: 'Assinaturas & Serviços',
    suggestedDay: 5,
    description: 'Telefonia móvel e dados',
  },
  {
    name: 'Internet / Wi-Fi',
    icon: 'Wifi',
    defaultCategoryName: 'Assinaturas & Serviços',
    suggestedDay: 12,
    description: 'Internet banda larga residencial',
  },
  {
    name: 'Aluguel / Condomínio',
    icon: 'Home',
    defaultCategoryName: 'Moradia & Contas',
    suggestedDay: 5,
    description: 'Moradia e taxa condominial',
  },
  {
    name: 'Streaming / Assinatura',
    icon: 'Tv',
    defaultCategoryName: 'Assinaturas & Serviços',
    suggestedDay: 20,
    description: 'Netflix, Spotify, Prime, etc.',
  },
];

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
  isCreateModalOpen,
  onCloseCreateModal,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fixed' | 'installment'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Estados dos modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBill, setEditingBill] = useState<PayableBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);
  const [billToPayoff, setBillToPayoff] = useState<PayableBill | null>(null);

  // Form states
  const [billType, setBillType] = useState<'fixed' | 'installment'>('fixed');
  const [name, setName] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [dueDay, setDueDay] = useState('10');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Receipt');

  // Fecha e limpa completamente o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
    setBillType('fixed');
    setName('');
    setInstallmentAmount('');
    setTotalInstallments('12');
    setPaidInstallments('0');
    setDueDay('10');
    setCategory(categories[0]?.id || '');
    setNotes('');
    setSelectedIcon('Receipt');
    setIsSubmitting(false);
    if (onCloseCreateModal) {
      onCloseCreateModal();
    }
  };

  // Abre modal para criar (geral)
  const handleOpenCreate = (initialType: 'fixed' | 'installment' = 'fixed') => {
    setEditingBill(null);
    setBillType(initialType);
    setName('');
    setInstallmentAmount('');
    setTotalInstallments(initialType === 'fixed' ? '0' : '12');
    setPaidInstallments('0');
    setDueDay('10');
    setCategory(categories[0]?.id || '');
    setNotes('');
    setSelectedIcon(initialType === 'fixed' ? 'Droplets' : 'CreditCard');
    const today = new Date();
    setDueDate(today.toISOString().split('T')[0]);
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  // Abre modal com preset rápido de conta fixa (Água, Luz, Celular, etc.)
  const handleOpenPreset = (preset: FixedPreset) => {
    setEditingBill(null);
    setBillType('fixed');
    setName(preset.name);
    setInstallmentAmount('');
    setTotalInstallments('0');
    setPaidInstallments('0');
    setDueDay(String(preset.suggestedDay));
    setSelectedIcon(preset.icon);
    
    // Tenta encontrar a categoria correspondente
    const matchingCat = categories.find(c => 
      c.name.toLowerCase().includes(preset.defaultCategoryName.toLowerCase().split('&')[0].trim())
    );
    setCategory(matchingCat?.id || categories[0]?.id || '');
    setNotes(preset.description);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(preset.suggestedDay).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}`);

    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  // Responde ao prop externo de abrir modal se fornecido
  React.useEffect(() => {
    if (isCreateModalOpen) {
      handleOpenCreate('fixed');
    }
  }, [isCreateModalOpen]);

  // Abre modal para editar
  const handleOpenEdit = (bill: PayableBill) => {
    setEditingBill(bill);
    const isFixed = bill.billType === 'fixed' || Number(bill.totalInstallments) === 0;
    setBillType(isFixed ? 'fixed' : 'installment');
    setName(bill.name);
    setInstallmentAmount(bill.installmentAmount ? String(bill.installmentAmount) : '');
    setTotalInstallments(String(bill.totalInstallments || (isFixed ? 0 : 12)));
    setPaidInstallments(String(bill.paidInstallments || 0));
    setDueDate(bill.dueDate);
    
    // Extrai o dia para o campo de dia de vencimento
    if (bill.dueDate && bill.dueDate.includes('-')) {
      const parts = bill.dueDate.split('-');
      if (parts[2]) {
        setDueDay(String(parseInt(parts[2], 10)));
      }
    }
    
    setCategory(bill.category || categories[0]?.id || '');
    setNotes(bill.notes || '');
    setSelectedIcon(bill.iconName || (isFixed ? 'Receipt' : 'CreditCard'));
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountNum = parseFloat(installmentAmount.replace(',', '.'));
    if (!name.trim() || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    const isFixed = billType === 'fixed';
    const totalInstNum = isFixed ? 0 : (parseInt(totalInstallments, 10) || 1);
    const paidInstNum = isFixed ? 0 : (parseInt(paidInstallments, 10) || 0);

    // Constrói a data de vencimento
    let computedDueDate = dueDate;
    if (isFixed) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const dayNum = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 10));
      computedDueDate = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
    }

    setIsSubmitting(true);

    // Gera ID único garantido com timestamp e aleatoriedade
    const uniqueBillId = editingBill 
      ? editingBill.id 
      : `bill-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

    const billData: PayableBill = {
      id: uniqueBillId,
      name: name.trim(),
      installmentAmount: amountNum,
      totalInstallments: totalInstNum,
      paidInstallments: Math.min(paidInstNum, totalInstNum),
      dueDate: computedDueDate || new Date().toISOString().split('T')[0],
      category: category || '',
      notes: notes.trim() || '',
      createdAt: editingBill?.createdAt || new Date().toISOString(),
      billType: isFixed ? 'fixed' : 'installment',
      lastPaidMonth: editingBill?.lastPaidMonth || '',
      iconName: selectedIcon || (isFixed ? 'Receipt' : 'CreditCard'),
    };

    if (editingBill) {
      onUpdateBill(billData);
    } else {
      onAddBill(billData);
    }

    handleCloseModal();
  };

  // =========================================================================
  // TOTAIS CONSOLIDADOS DE TODAS AS CONTAS CADASTRADAS (FIXAS + PARCELADAS)
  // Calcula rigorosamente o somatório de TODAS as contas cadastradas
  // =========================================================================
  const metrics = useMemo(() => {
    let totalRemaining = 0;
    let totalPaid = 0;
    let totalContracted = 0;
    let totalThisMonthCommitment = 0;
    let totalMonthlyRecurrent = 0;
    let pendingBillsCount = 0;
    let completedBillsCount = 0;
    let fixedBillsCount = 0;
    let installmentBillsCount = 0;

    // Deduplica estritamente por ID
    const uniqueBills = new Map<string, PayableBill>();
    bills.forEach(b => {
      if (b && b.id) {
        uniqueBills.set(b.id, b);
      }
    });

    uniqueBills.forEach(bill => {
      const isFixed = bill.billType === 'fixed' || Number(bill.totalInstallments) === 0;
      const instAmount = Number(bill.installmentAmount) || 0;

      totalMonthlyRecurrent += instAmount;

      if (isFixed) {
        fixedBillsCount++;
        const isPaidThisMonth = bill.lastPaidMonth === currentMonth;

        if (isPaidThisMonth) {
          completedBillsCount++;
          totalPaid += instAmount;
          totalContracted += instAmount;
        } else {
          pendingBillsCount++;
          totalRemaining += instAmount;
          totalContracted += instAmount;
          totalThisMonthCommitment += instAmount;
        }
      } else {
        installmentBillsCount++;
        const totalInst = Number(bill.totalInstallments) || 0;
        const paidInst = Number(bill.paidInstallments) || 0;

        const remainingInstallments = Math.max(0, totalInst - paidInst);
        const remainingAmount = remainingInstallments * instAmount;
        const paidAmount = paidInst * instAmount;
        const contractedAmount = totalInst * instAmount;

        totalRemaining += remainingAmount;
        totalPaid += paidAmount;
        totalContracted += contractedAmount;

        if (remainingInstallments === 0 && totalInst > 0) {
          completedBillsCount++;
        } else {
          pendingBillsCount++;
          totalThisMonthCommitment += instAmount;
        }
      }
    });

    const overallProgress = totalContracted > 0 ? (totalPaid / totalContracted) * 100 : 0;
    const totalBillsCount = uniqueBills.size;

    return {
      totalRemaining,
      totalPaid,
      totalContracted,
      totalThisMonthCommitment,
      totalMonthlyRecurrent,
      totalBillsCount,
      fixedBillsCount,
      installmentBillsCount,
      pendingBillsCount,
      completedBillsCount,
      overallProgress,
    };
  }, [bills, currentMonth]);

  // Formata exibição da data de vencimento
  const formatDueDisplay = (dateStr: string, isFixed: boolean) => {
    if (!dateStr) return 'Data não definida';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;

    if (isFixed) {
      return `Todo dia ${parseInt(day, 10)}`;
    }

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const monthName = monthNames[parseInt(month, 10) - 1] || month;
    return `dia ${parseInt(day, 10)} de ${monthName}`;
  };

  // Status visual da conta
  const getBillStatus = (bill: PayableBill) => {
    const isFixed = bill.billType === 'fixed' || Number(bill.totalInstallments) === 0;

    if (isFixed) {
      const isPaidThisMonth = bill.lastPaidMonth === currentMonth;
      if (isPaidThisMonth) {
        return { label: 'Paga este Mês', color: 'text-lime-400 bg-lime-400/10 border-lime-400/30' };
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (bill.dueDate === todayStr) {
        return { label: 'Vence Hoje', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
      }
      if (bill.dueDate < todayStr) {
        return { label: 'Vencida este Mês', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      }
      return { label: 'A Pagar no Mês', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
    }

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

  // Renderiza ícone específico da conta
  const renderBillIcon = (bill: PayableBill) => {
    const iconName = bill.iconName;
    const isFixed = bill.billType === 'fixed' || Number(bill.totalInstallments) === 0;

    if (iconName === 'Droplets') return <Droplets className="w-5 h-5 text-cyan-400" />;
    if (iconName === 'Zap') return <Zap className="w-5 h-5 text-yellow-400" />;
    if (iconName === 'Smartphone') return <Smartphone className="w-5 h-5 text-purple-400" />;
    if (iconName === 'Wifi') return <Wifi className="w-5 h-5 text-blue-400" />;
    if (iconName === 'Home') return <Home className="w-5 h-5 text-emerald-400" />;
    if (iconName === 'Tv') return <Tv className="w-5 h-5 text-pink-400" />;

    if (isFixed) {
      return <Receipt className="w-5 h-5 text-amber-400" />;
    }
    return <CreditCard className="w-5 h-5 text-lime-400" />;
  };

  // Filtragem da lista
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const isFixed = b.billType === 'fixed' || Number(b.totalInstallments) === 0;

      // Filtro por tipo de conta
      if (typeFilter === 'fixed' && !isFixed) return false;
      if (typeFilter === 'installment' && isFixed) return false;

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesNotes = b.notes?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesNotes) return false;
      }

      // Filtro por status
      const isCompleted = isFixed 
        ? b.lastPaidMonth === currentMonth 
        : b.paidInstallments >= b.totalInstallments;

      if (statusFilter === 'completed') return isCompleted;
      if (statusFilter === 'pending') return !isCompleted;

      return true;
    });
  }, [bills, searchTerm, typeFilter, statusFilter, currentMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ================================================================= */}
      {/* TOP BANNER COM MÉTRICAS CONSOLIDADAS (SOMA DE TODAS AS CONTAS) */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total que Falta Pagar (Soma Geral de Todas as Contas) */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-rose-400 tracking-wide uppercase">Falta Pagar (Total Geral)</span>
              <span className="text-[10px] text-zinc-500 font-medium">Soma de todas as contas cadastradas</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400 tracking-tight">
              {formatCurrency(metrics.totalRemaining, privacyMode)}
            </div>
            <div className="text-xs text-zinc-400 mt-2 space-y-1">
              <p className="flex items-center justify-between text-[11px]">
                <span>Contas pendentes:</span>
                <strong className="text-zinc-200">{metrics.pendingBillsCount} de {metrics.totalBillsCount} contas</strong>
              </p>
              {metrics.totalThisMonthCommitment > 0 && (
                <p className="flex items-center justify-between text-[11px] text-amber-400/95 pt-1 border-t border-zinc-800/80">
                  <span>Pagar neste mês atual:</span>
                  <strong>{formatCurrency(metrics.totalThisMonthCommitment, privacyMode)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total Já Quitado / Pago (Soma Geral) */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-lime-400 tracking-wide uppercase">Total Já Quitado</span>
              <span className="text-[10px] text-zinc-500 font-medium">Amortizado em todas as contas</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(metrics.totalPaid, privacyMode)}
            </div>
            <div className="text-xs text-zinc-400 mt-2 space-y-1">
              <p className="flex items-center justify-between text-[11px]">
                <span>Contas em dia / quitadas:</span>
                <strong className="text-lime-400">{metrics.completedBillsCount} de {metrics.totalBillsCount} contas</strong>
              </p>
              <p className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                <span>Total geral somado:</span>
                <strong className="text-zinc-200">{formatCurrency(metrics.totalContracted, privacyMode)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Progresso Geral (Média de Quitação de Todas as Contas) */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Progresso Geral</span>
              <span className="text-[10px] text-zinc-500 font-medium">Quitação de todas as contas</span>
            </div>
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
                do total amortizado
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="h-full bg-lime-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics.overallProgress))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
              <span>{formatCurrency(metrics.totalPaid, privacyMode)} pagos</span>
              <span>{formatCurrency(metrics.totalRemaining, privacyMode)} restantes</span>
            </div>
          </div>
        </div>

        {/* Compromisso Mensal Recorrente & Nova Conta CTA */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sky-400 tracking-wide uppercase">Custo Mensal Somado</span>
              <span className="text-[10px] text-zinc-500 font-medium">{metrics.fixedBillsCount} fixas • {metrics.installmentBillsCount} parcelamentos</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(metrics.totalMonthlyRecurrent, privacyMode)}<span className="text-xs font-normal text-zinc-400">/mês</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => handleOpenCreate('fixed')}
                className="py-1.5 px-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-bold rounded-xl text-[11px] border border-sky-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Conta Fixa</span>
              </button>
              <button
                onClick={() => handleOpenCreate('installment')}
                className="py-1.5 px-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Parcela</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BARRA DE ATALHOS RÁPIDOS: CONTAS FIXAS ESSENCIAIS (ÁGUA, LUZ, ETC) */}
      {/* ================================================================= */}
      <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime-400 shrink-0" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cadastrar Contas Fixas Rápidas (Água, Luz, Celular, etc.)
            </h4>
          </div>
          <span className="text-[11px] text-zinc-400">
            Clique para preencher em 1 segundo
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {FIXED_BILL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleOpenPreset(preset)}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-lime-400/40 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {preset.icon === 'Droplets' && <Droplets className="w-4 h-4 text-cyan-400" />}
                {preset.icon === 'Zap' && <Zap className="w-4 h-4 text-yellow-400" />}
                {preset.icon === 'Smartphone' && <Smartphone className="w-4 h-4 text-purple-400" />}
                {preset.icon === 'Wifi' && <Wifi className="w-4 h-4 text-blue-400" />}
                {preset.icon === 'Home' && <Home className="w-4 h-4 text-emerald-400" />}
                {preset.icon === 'Tv' && <Tv className="w-4 h-4 text-pink-400" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-zinc-200 block truncate group-hover:text-white">
                  {preset.name}
                </span>
                <span className="text-[10px] text-zinc-500 block truncate">
                  Dia {preset.suggestedDay}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* BARRA DE FILTROS, ABAS E BUSCA */}
      {/* ================================================================= */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar conta por nome..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
          />
        </div>

        {/* Filtros por Tipo de Conta (Fixas vs Parcelamentos) */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({bills.length})
          </button>
          <button
            onClick={() => setTypeFilter('fixed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'fixed'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Contas Fixas ({metrics.fixedBillsCount})</span>
          </button>
          <button
            onClick={() => setTypeFilter('installment')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'installment'
                ? 'bg-lime-400/20 text-lime-300 font-bold border border-lime-400/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Parcelamentos ({metrics.installmentBillsCount})</span>
          </button>
        </div>

        {/* Filtros por Status & Botão Nova Conta */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'all' ? 'text-zinc-200 font-bold bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos Status
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending' ? 'text-amber-400 font-bold bg-amber-500/15' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Pendentes ({metrics.pendingBillsCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'completed' ? 'text-lime-400 font-bold bg-lime-400/15' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Pagas/Quitadas ({metrics.completedBillsCount})
            </button>
          </div>

          <button
            onClick={() => handleOpenCreate('fixed')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-lime-400/20 whitespace-nowrap shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* LISTA DE CONTAS A PAGAR */}
      {/* ================================================================= */}
      {filteredBills.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-dashed border-zinc-800 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Nenhuma conta encontrada</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
              {bills.length === 0
                ? 'Cadastre suas contas fixas mensais (água, luz, celular, aluguel) ou parcelamentos para acompanhar a soma de tudo o que você tem a pagar!'
                : 'Nenhuma conta corresponde aos filtros selecionados. Altere os filtros acima para ver todas as contas.'}
            </p>
          </div>
          {bills.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleOpenCreate('fixed')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold rounded-xl border border-sky-500/40 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Adicionar Conta Fixa</span>
              </button>
              <button
                onClick={() => handleOpenCreate('installment')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-lime-400/20"
              >
                <CreditCard className="w-4 h-4" />
                <span>Adicionar Parcelamento</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map(bill => {
            const isFixed = bill.billType === 'fixed' || Number(bill.totalInstallments) === 0;
            const isCompleted = isFixed
              ? bill.lastPaidMonth === currentMonth
              : bill.paidInstallments >= bill.totalInstallments;

            const remainingInstallments = isFixed 
              ? (isCompleted ? 0 : 1) 
              : Math.max(0, bill.totalInstallments - bill.paidInstallments);

            const remainingAmount = isFixed 
              ? (isCompleted ? 0 : bill.installmentAmount) 
              : remainingInstallments * bill.installmentAmount;

            const totalPaidAmount = isFixed 
              ? (isCompleted ? bill.installmentAmount : 0) 
              : bill.paidInstallments * bill.installmentAmount;

            const totalContractedAmount = isFixed 
              ? bill.installmentAmount 
              : bill.totalInstallments * bill.installmentAmount;

            const progress = isFixed 
              ? (isCompleted ? 100 : 0) 
              : (bill.totalInstallments > 0 ? (bill.paidInstallments / bill.totalInstallments) * 100 : 0);

            const status = getBillStatus(bill);

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
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                        {renderBillIcon(bill)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                            {bill.name}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            <span>Vencimento: <strong className="text-zinc-200">{formatDueDisplay(bill.dueDate, isFixed)}</strong></span>
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                            isFixed ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {isFixed ? 'Conta Fixa Mensal' : 'Parcelamento'}
                          </span>
                        </div>
                      </div>
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

                  {/* Informações de Valores e Parcela */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl my-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-500">
                        {isFixed ? 'Valor Mensal' : 'Parcela Atual'}
                      </span>
                      <div className="font-bold text-white text-sm mt-0.5 flex items-baseline gap-1">
                        {isFixed ? (
                          <span>{formatCurrency(bill.installmentAmount, privacyMode)}</span>
                        ) : (
                          <>
                            <span>
                              {isCompleted 
                                ? `${bill.totalInstallments}/${bill.totalInstallments}` 
                                : `${String(bill.paidInstallments + 1).padStart(2, '0')}/${String(bill.totalInstallments).padStart(2, '0')}`}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-normal">
                              ({bill.paidInstallments} de {bill.totalInstallments})
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {isFixed ? (
                          <span>Recorrente todo mês</span>
                        ) : (
                          <span>Valor: <strong className="text-zinc-200">{formatCurrency(bill.installmentAmount, privacyMode)}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-rose-400">
                        {isFixed ? 'Pendente este Mês' : 'Total que Falta Pagar'}
                      </span>
                      <div className="font-bold text-rose-400 text-sm mt-0.5">
                        {formatCurrency(remainingAmount, privacyMode)}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {isFixed 
                          ? (isCompleted ? 'Pago neste mês' : 'Aguardando baixa')
                          : `Total: ${formatCurrency(totalContractedAmount, privacyMode)}`}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  {!isFixed ? (
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-400">Progresso de Quitação</span>
                        <span className={`font-bold ${isCompleted ? 'text-lime-400' : 'text-zinc-200'}`}>
                          {progress.toFixed(0)}% concluído ({formatCurrency(totalPaidAmount, privacyMode)} pago)
                        </span>
                      </div>

                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-lime-400"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] mb-3 px-1">
                      <span className="text-zinc-400">Status deste mês ({currentMonth}):</span>
                      <strong className={isCompleted ? 'text-lime-400' : 'text-amber-400'}>
                        {isCompleted ? 'Paga com sucesso!' : 'Pendente de pagamento'}
                      </strong>
                    </div>
                  )}

                  {bill.notes && (
                    <p className="text-[11px] text-zinc-400 italic mb-3 bg-zinc-800/40 p-2 rounded-lg">
                      "{bill.notes}"
                    </p>
                  )}
                </div>

                {/* Ações da Conta */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Botão de desfazer / voltar */}
                    {isFixed ? (
                      isCompleted && (
                        <button
                          onClick={() => onRevertInstallment(bill.id)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Desmarcar pagamento deste mês"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Voltar a pendente</span>
                        </button>
                      )
                    ) : (
                      bill.paidInstallments > 0 && (
                        <button
                          onClick={() => onRevertInstallment(bill.id)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Desfazer 1 parcela"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Voltar 1</span>
                        </button>
                      )
                    )}

                    {!isFixed && !isCompleted && remainingInstallments > 1 && (
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

                  {/* Botão Principal de Baixa */}
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-lime-400 bg-lime-400/10 px-3 py-1.5 rounded-xl border border-lime-400/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isFixed ? 'Paga este Mês!' : 'Quitada!'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onPayInstallment(bill.id)}
                      className="px-3.5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl shadow-md shadow-lime-400/20 hover:shadow-lime-400/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isFixed ? `Pagar Conta (${formatCurrency(bill.installmentAmount, privacyMode)})` : 'Pagar Parcela'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL ADICIONAR / EDITAR CONTA (FIXA OU PARCELADA) */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseModal}
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
                  {billType === 'fixed'
                    ? 'Conta fixa recorrente (água, luz, telefone, internet, aluguel)'
                    : 'Parcelamento com quantidade fixa de vezes (carro, cartão, empréstimo)'}
                </p>
              </div>
            </div>

            {/* SELETOR DE TIPO: CONTA FIXA VS PARCELAMENTO */}
            <div className="p-1 bg-zinc-950 border border-zinc-800 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setBillType('fixed');
                  if (!name) setSelectedIcon('Droplets');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  billType === 'fixed'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Conta Fixa Mensal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBillType('installment');
                  setSelectedIcon('CreditCard');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  billType === 'installment'
                    ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Parcelamento</span>
              </button>
            </div>

            {/* SUGESTÕES RÁPIDAS PARA CONTA FIXA */}
            {billType === 'fixed' && !editingBill && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 block">
                  Ou selecione um modelo pronto:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {FIXED_BILL_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setName(p.name);
                        setSelectedIcon(p.icon);
                        setDueDay(String(p.suggestedDay));
                        const matchCat = categories.find(c => 
                          c.name.toLowerCase().includes(p.defaultCategoryName.toLowerCase().split('&')[0].trim())
                        );
                        if (matchCat) setCategory(matchCat.id);
                        if (!notes) setNotes(p.description);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        name === p.name 
                          ? 'border-lime-400 bg-lime-400/10 text-lime-300' 
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="mx-auto mb-1 flex items-center justify-center">
                        {p.icon === 'Droplets' && <Droplets className="w-3.5 h-3.5 text-cyan-400" />}
                        {p.icon === 'Zap' && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                        {p.icon === 'Smartphone' && <Smartphone className="w-3.5 h-3.5 text-purple-400" />}
                        {p.icon === 'Wifi' && <Wifi className="w-3.5 h-3.5 text-blue-400" />}
                        {p.icon === 'Home' && <Home className="w-3.5 h-3.5 text-emerald-400" />}
                        {p.icon === 'Tv' && <Tv className="w-3.5 h-3.5 text-pink-400" />}
                      </div>
                      <span className="text-[10px] font-bold block truncate">{p.name.replace('Conta de ', '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome da Conta *
                </label>
                <input
                  type="text"
                  required
                  placeholder={billType === 'fixed' ? 'Ex: Conta de Luz, Água, Celular Tim, Internet' : 'Ex: Financiamento Carro, Compra Notebook'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                />
              </div>

              {billType === 'fixed' ? (
                /* CAMPOS PARA CONTA FIXA */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Valor Mensal (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 120.00"
                      value={installmentAmount}
                      onChange={e => setInstallmentAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                    />
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      Valor estimado ou média mensal
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Dia do Vencimento no Mês *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        placeholder="Ex: 10"
                        value={dueDay}
                        onChange={e => setDueDay(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      Ex: Todo dia {dueDay || '10'} de cada mês
                    </span>
                  </div>
                </div>
              ) : (
                /* CAMPOS PARA PARCELAMENTO */
                <>
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
                        Deixe 0 se começou agora
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Próximo Vencimento *
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
                </>
              )}

              {/* CATEGORIA */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-lime-400"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ANOTAÇÕES */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Anotações / Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Débito automático na conta, código Pix salvo ou fatura no e-mail..."
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
                      handleCloseModal();
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
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-lime-400/20 active:scale-98"
                  >
                    {isSubmitting ? 'Salvando...' : editingBill ? 'Salvar Alterações' : 'Cadastrar Conta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO PARA EXCLUIR CONTA */}
      {/* ================================================================= */}
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
                  Tem certeza que deseja remover esta conta? Esta confirmação previne exclusões acidentais.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white text-sm truncate">{billToDelete.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  {billToDelete.billType === 'fixed' ? 'Conta Fixa' : `Parcela ${billToDelete.paidInstallments}/${billToDelete.totalInstallments}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-900 text-zinc-400 text-[11px]">
                <div>
                  <span>Valor:</span>
                  <strong className="block text-zinc-200 font-semibold mt-0.5">
                    {formatCurrency(billToDelete.installmentAmount, privacyMode)}
                  </strong>
                </div>
                <div>
                  <span>Tipo:</span>
                  <strong className="block text-zinc-200 font-semibold mt-0.5">
                    {billToDelete.billType === 'fixed' ? 'Mensal Recorrente' : 'Parcelamento'}
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

      {/* ================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO PARA QUITAR TUDO (PARCELAMENTO) */}
      {/* ================================================================= */}
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
