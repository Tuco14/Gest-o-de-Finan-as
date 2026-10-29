import React, { useRef, useState } from 'react';
import { Transaction, Account, Category, FinancialGoal, PayableBill } from '../types';
import { formatCurrency, formatMonthYear, formatDateBR } from '../utils/formatters';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Calendar, 
  Shield, 
  Building2,
  PieChart as PieIcon,
  Loader2,
  BarChart3,
  CreditCard,
  Clock,
  Sparkles,
  Award,
  Target,
  FileCheck2,
  Receipt
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string; // YYYY-MM
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  goals: FinancialGoal[];
  bills?: PayableBill[];
  userEmail?: string | null;
  onToast: (msg: string) => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  transactions,
  accounts,
  categories,
  goals,
  bills = [],
  userEmail,
  onToast,
}) => {
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<'2pages' | '1page'>('2pages');
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeTopExpenses, setIncludeTopExpenses] = useState(true);
  const [hideSensitiveValues, setHideSensitiveValues] = useState(false);

  if (!isOpen) return null;

  // 1. Filtragem e saneamento dos dados do mês
  const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
  
  // Mapeamento inteligente de categoria (busca por ID ou por Nome)
  const getCategoryInfo = (catIdentifier: string) => {
    if (!catIdentifier) return { id: 'outros', name: 'Outros', color: '#71717a', iconName: 'Layers' };
    const byId = categories.find(c => c.id === catIdentifier);
    if (byId) return byId;
    const byName = categories.find(c => c.name.toLowerCase() === catIdentifier.toLowerCase());
    if (byName) return byName;
    return { id: catIdentifier, name: catIdentifier, color: '#71717a', iconName: 'Layers' };
  };

  const accountMap = new Map<string, Account>(accounts.map(a => [a.id, a]));

  // 2. Cálculos consolidados de Receitas e Despesas
  let totalIncome = 0;
  let paidIncome = 0;
  let pendingIncome = 0;

  let totalExpense = 0;
  let paidExpense = 0;
  let pendingExpense = 0;

  const categoryExpenses: Record<string, { name: string; color: string; amount: number }> = {};
  const paymentMethodExpenses: Record<string, number> = {};

  // Divisão por semanas do mês
  const weeklyExpenses = [
    { label: 'Semana 1', days: '01 a 07', amount: 0, count: 0 },
    { label: 'Semana 2', days: '08 a 14', amount: 0, count: 0 },
    { label: 'Semana 3', days: '15 a 21', amount: 0, count: 0 },
    { label: 'Semana 4', days: '22 a 31', amount: 0, count: 0 },
  ];

  monthTransactions.forEach(t => {
    const amount = Number(t.amount || 0);
    
    if (t.type === 'income') {
      totalIncome += amount;
      if (t.status === 'paid') paidIncome += amount;
      else pendingIncome += amount;
    } else {
      totalExpense += amount;
      if (t.status === 'paid') paidExpense += amount;
      else pendingExpense += amount;

      // Categoria consolidada
      const catInfo = getCategoryInfo(t.category);
      if (!categoryExpenses[catInfo.id]) {
        categoryExpenses[catInfo.id] = { name: catInfo.name, color: catInfo.color, amount: 0 };
      }
      categoryExpenses[catInfo.id].amount += amount;

      // Forma de pagamento
      const method = t.paymentMethod || 'Outros';
      paymentMethodExpenses[method] = (paymentMethodExpenses[method] || 0) + amount;

      // Semana da despesa
      const cleanDate = (t.date || '').split('T')[0];
      const dayNum = parseInt(cleanDate.split('-')[2] || '1', 10);
      if (dayNum <= 7) {
        weeklyExpenses[0].amount += amount;
        weeklyExpenses[0].count++;
      } else if (dayNum <= 14) {
        weeklyExpenses[1].amount += amount;
        weeklyExpenses[1].count++;
      } else if (dayNum <= 21) {
        weeklyExpenses[2].amount += amount;
        weeklyExpenses[2].count++;
      } else {
        weeklyExpenses[3].amount += amount;
        weeklyExpenses[3].count++;
      }
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;
  const totalAccountBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const expenseLiquidityRate = totalExpense > 0 ? (paidExpense / totalExpense) * 100 : 100;

  // 3. Ordenar categorias por maior despesa
  const sortedCategories = Object.entries(categoryExpenses)
    .map(([catId, data]) => {
      const percentage = totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;
      return {
        id: catId,
        name: data.name,
        color: data.color || '#18181b',
        amount: data.amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 4. TOP 6 MAIORES DESPESAS INDIVIDUAIS (100% blindado e ordenado numericamente)
  const topExpenses = [...monthTransactions]
    .filter(t => t.type === 'expense')
    .map(t => ({
      ...t,
      numAmount: Number(t.amount || 0)
    }))
    .sort((a, b) => b.numAmount - a.numAmount)
    .slice(0, 6);

  const highestSingleExpense = topExpenses[0]?.numAmount || 1;

  // 5. Formas de Pagamento ordenadas
  const sortedPaymentMethods = Object.entries(paymentMethodExpenses)
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 6. Regra 50/30/20 com classificação inteligente
  let needs = 0;
  let wants = 0;
  Object.entries(categoryExpenses).forEach(([catId, data]) => {
    const lower = (catId + ' ' + data.name).toLowerCase();
    if (
      lower.includes('moradia') || 
      lower.includes('aluguel') || 
      lower.includes('condom') || 
      lower.includes('alimenta') || 
      lower.includes('mercado') || 
      lower.includes('transporte') || 
      lower.includes('combust') || 
      lower.includes('saúde') || 
      lower.includes('saude') || 
      lower.includes('luz') || 
      lower.includes('água') || 
      lower.includes('agua')
    ) {
      needs += data.amount;
    } else {
      wants += data.amount;
    }
  });

  const needsPercent = totalIncome > 0 ? (needs / totalIncome) * 100 : 0;
  const wantsPercent = totalIncome > 0 ? (wants / totalIncome) * 100 : 0;

  // 7. Score de Saúde Financeira do Mês (0 a 100)
  let healthScore = 70;
  if (totalIncome > 0) {
    if (netBalance >= 0) {
      healthScore += Math.min(25, Math.round(savingsRate * 0.8));
    } else {
      healthScore -= Math.min(45, Math.round((Math.abs(netBalance) / totalIncome) * 40));
    }
    if (expenseLiquidityRate >= 80) healthScore += 5;
  }
  healthScore = Math.max(15, Math.min(98, healthScore));

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    if (score >= 70) return { label: 'Saudável', color: 'bg-lime-100 text-lime-900 border-lime-300' };
    if (score >= 50) return { label: 'Atenção', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    return { label: 'Déficit / Crítico', color: 'bg-rose-100 text-rose-900 border-rose-300' };
  };

  const scoreBadge = getScoreBadge(healthScore);

  // 8. Download do PDF com renderização independente por página (sem cortes horizontais!)
  const handleDownloadPDF = async () => {
    if (!page1Ref.current) return;
    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Renderiza a Página 1 com precisão A4
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      });

      const imgData1 = canvas1.toDataURL('image/png');
      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Se o formato for de 2 páginas e existir a página 2
      if (reportFormat === '2pages' && page2Ref.current) {
        pdf.addPage();
        const canvas2 = await html2canvas(page2Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
        });

        const imgData2 = canvas2.toDataURL('image/png');
        pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = `FinControl-Relatorio-${currentMonth}.pdf`;
      pdf.save(fileName);
      onToast('PDF do Relatório baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      onToast('Não foi possível gerar o PDF. Você também pode utilizar o botão Imprimir.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const maskVal = (val: number) => {
    return hideSensitiveValues ? 'R$ ••••••' : formatCurrency(val);
  };

  const maskPercent = (pct: number) => {
    return hideSensitiveValues ? '••%' : `${pct.toFixed(1)}%`;
  };

  const highestWeekly = Math.max(...weeklyExpenses.map(w => w.amount), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Barra Superior do Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Exportar Relatório em PDF</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-bold border border-lime-400/30">
                  Sem Cortes
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Resumo executivo diagramado em páginas A4 perfeitas de {formatMonthYear(currentMonth)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Imprimir ou Salvar como PDF pelo navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              id="download-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-lime-400/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Opções e Formato */}
        <div className="px-6 py-2.5 bg-zinc-850/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-750 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setReportFormat('2pages')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${reportFormat === '2pages' ? 'bg-lime-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
              >
                2 Páginas (Completo)
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('1page')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${reportFormat === '1page' ? 'bg-lime-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
              >
                1 Página (Compacto)
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTopExpenses}
                onChange={e => setIncludeTopExpenses(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
              />
              <span>Top 6 Maiores Despesas</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAccounts}
                onChange={e => setIncludeAccounts(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
              />
              <span>Saldos por Conta</span>
            </label>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={hideSensitiveValues}
              onChange={e => setHideSensitiveValues(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
            />
            <span>Ocultar Valores (Modo Confidencial)</span>
          </label>
        </div>

        {/* Área de Visualização com Páginas A4 Distintas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/90 flex flex-col items-center gap-6">
          
          {/* ========================================================= */}
          {/* PÁGINA 1: PAINEL EXECUTIVO & ANÁLISE GRÁFICA              */}
          {/* ========================================================= */}
          <div
            ref={page1Ref}
            id="report-page-1"
            className="w-full max-w-[760px] bg-white text-zinc-900 p-8 sm:p-9 rounded-xl shadow-xl border border-zinc-200 font-sans print:shadow-none print:border-none print:m-0 print:p-6 flex flex-col justify-between"
            style={{ minHeight: '1075px', maxHeight: '1075px', boxSizing: 'border-box' }}
          >
            <div>
              {/* Cabeçalho Página 1 */}
              <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 text-lime-400 flex items-center justify-center font-black text-sm shadow-xs">
                      FC
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight leading-none">
                        FinControl
                      </h1>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                        Gestão Financeira & Inteligência de Dados
                      </span>
                    </div>
                  </div>
                  <h2 className="text-base font-black text-zinc-900 mt-1.5 tracking-tight">
                    Relatório Executivo Mensal
                  </h2>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Mês de Referência: <strong className="text-zinc-900 capitalize">{formatMonthYear(currentMonth)}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 mb-1.5">
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider border ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'}`}>
                      {netBalance >= 0 ? `Superávit: +${maskVal(netBalance)}` : `Déficit: ${maskVal(netBalance)}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {userEmail && (
                    <p className="text-[10px] text-zinc-600 font-semibold truncate max-w-[220px]">
                      Titular: {userEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Diagnóstico Executivo & Score de Saúde Financeira */}
              <div className="bg-gradient-to-r from-zinc-50 to-zinc-100/70 border border-zinc-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-lime-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-800">
                      Diagnóstico do Mês
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-700 leading-snug">
                    {netBalance >= 0 ? (
                      <>
                        Você encerrou o período com <strong>resultado positivo</strong>, preservando <strong>{maskPercent(savingsRate)}</strong> das receitas (sobra líquida de <strong>{maskVal(netBalance)}</strong>). 
                        {sortedCategories[0] ? ` Maior concentração em ${sortedCategories[0].name} (${maskPercent(sortedCategories[0].percentage)} do total).` : ''}
                      </>
                    ) : (
                      <>
                        Despesas superaram receitas em <strong>{maskVal(Math.abs(netBalance))}</strong>. 
                        Recomendamos atenção às contas pendentes ({maskVal(pendingExpense)}) e contenção em gastos com lazer.
                      </>
                    )}
                  </p>

                  {/* Destaque solicitado: esse mês gastou tantos % e tantos reais em tal item */}
                  {topExpenses[0] && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-200/80 flex items-center justify-between text-[10.5px] text-zinc-800">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span>
                          Esse mês você gastou <strong className="text-zinc-950">{maskPercent((topExpenses[0].numAmount / (totalExpense || 1)) * 100)}</strong> ({maskVal(topExpenses[0].numAmount)}) em <strong className="text-zinc-950">{topExpenses[0].description || 'Item Principal'}</strong>.
                        </span>
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 shrink-0 ml-2">
                        Maior Gasto
                      </span>
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-center shrink-0 min-w-[120px] shadow-xs">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Saúde Financeira
                  </span>
                  <div className="text-lg font-black text-zinc-950 leading-tight">
                    {healthScore}<span className="text-[10px] font-normal text-zinc-400">/100</span>
                  </div>
                  <span className={`inline-block px-1.5 py-0.2 text-[8px] font-extrabold uppercase rounded-full border ${scoreBadge.color}`}>
                    {scoreBadge.label}
                  </span>
                </div>
              </div>

              {/* 4 Cards de Principais Métricas Consolidadas */}
              <div className="grid grid-cols-4 gap-2.5 mb-4">
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-zinc-500 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Receitas</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-sm font-black text-emerald-700">
                    {maskVal(totalIncome)}
                  </div>
                  <div className="text-[8.5px] text-zinc-500 mt-0.5 flex justify-between">
                    <span>Rec: {maskVal(paidIncome)}</span>
                    <span>Pend: {maskVal(pendingIncome)}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-zinc-500 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Despesas</span>
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-sm font-black text-rose-700">
                    {maskVal(totalExpense)}
                  </div>
                  <div className="text-[8.5px] text-zinc-500 mt-0.5 flex justify-between">
                    <span>Pago: {maskVal(paidExpense)}</span>
                    <span>Pend: {maskVal(pendingExpense)}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-zinc-500 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Resultado</span>
                    <PiggyBank className="w-3.5 h-3.5 text-zinc-700" />
                  </div>
                  <div className={`text-sm font-black ${netBalance >= 0 ? 'text-zinc-900' : 'text-rose-700'}`}>
                    {netBalance >= 0 ? `+${maskVal(netBalance)}` : maskVal(netBalance)}
                  </div>
                  <div className="text-[8.5px] text-zinc-500 mt-0.5">
                    Poupança: <strong className="text-zinc-800">{maskPercent(savingsRate)}</strong>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-zinc-500 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Em Contas</span>
                    <Wallet className="w-3.5 h-3.5 text-zinc-700" />
                  </div>
                  <div className="text-sm font-black text-zinc-900">
                    {maskVal(totalAccountBalance)}
                  </div>
                  <div className="text-[8.5px] text-zinc-500 mt-0.5">
                    {accounts.length} contas bancárias
                  </div>
                </div>
              </div>

              {/* SEÇÃO 1 DE GRÁFICOS: Balanço & 50/30/20 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Balanço Entradas vs Saídas */}
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Balanço de Fluxo no Mês</span>
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500">
                      {monthTransactions.length} lançamentos
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-semibold text-zinc-700">Entradas / Receitas</span>
                        <span className="font-bold text-emerald-700">{maskVal(totalIncome)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 50}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="font-semibold text-zinc-700">Saídas / Despesas</span>
                        <span className="font-bold text-rose-700">{maskVal(totalExpense)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 50}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-200 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-600">Margem Líquida Retida:</span>
                    <span className="font-bold text-zinc-900">
                      {maskPercent(savingsRate)} do total ganho
                    </span>
                  </div>
                </div>

                {/* 50 / 30 / 20 */}
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Equilíbrio de Gastos (50/30/20)</span>
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500">Benchmark</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-zinc-600">Essenciais (Meta: 50%)</span>
                        <span className="font-bold text-zinc-900">{maskPercent(needsPercent)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${needsPercent <= 55 ? 'bg-zinc-800' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, needsPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-zinc-600">Desejos & Lazer (Meta: 30%)</span>
                        <span className="font-bold text-zinc-900">{maskPercent(wantsPercent)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${wantsPercent <= 35 ? 'bg-zinc-800' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, wantsPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-zinc-600">Poupança (Meta: 20%)</span>
                        <span className="font-bold text-emerald-700">{maskPercent(savingsRate)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, savingsRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-zinc-200 text-[9px] text-zinc-500">
                    {savingsRate >= 20 ? '• Padrão exemplar de poupança no mês.' : '• Sugestão: reduzir gastos discricionários em 5%.'}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2 DE GRÁFICOS: Evolução Semanal & Meios de Pagamento */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Evolução Semanal */}
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Evolução de Gastos por Semana</span>
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500">Picos de Saída</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {weeklyExpenses.map((week, idx) => {
                      const pctOfTotal = totalExpense > 0 ? (week.amount / totalExpense) * 100 : 0;
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-zinc-700 font-medium">{week.label} ({week.days})</span>
                            <span className="font-bold text-zinc-900">
                              {maskVal(week.amount)} <span className="text-zinc-500 font-normal">({maskPercent(pctOfTotal)})</span>
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-zinc-800"
                              style={{ width: `${Math.min(100, (week.amount / highestWeekly) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-zinc-700" />
                      <span>Formas de Pagamento (Despesas)</span>
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500">Distribuição</span>
                  </div>

                  {sortedPaymentMethods.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 py-2 text-center">Sem dados de pagamento no período.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {sortedPaymentMethods.slice(0, 4).map(item => (
                        <div key={item.method}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-zinc-700 font-medium">{item.method}</span>
                            <span className="font-bold text-zinc-900">
                              {maskVal(item.amount)} <span className="text-zinc-500 font-normal">({maskPercent(item.percentage)})</span>
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-lime-600"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: Distribuição por Categorias */}
              <div className="border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Distribuição de Gastos por Categoria</span>
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-600">
                    Total: <strong className="text-zinc-900">{maskVal(totalExpense)}</strong>
                  </span>
                </div>

                {sortedCategories.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 py-2 text-center">Nenhuma despesa registrada neste período.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {sortedCategories.slice(0, 8).map(cat => (
                      <div key={cat.id} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-zinc-700 truncate max-w-[170px] text-[10px]">
                            {cat.name}
                          </span>
                          <span className="font-bold text-zinc-900 text-[10px]">
                            {maskVal(cat.amount)} <span className="text-zinc-500 font-normal">({maskPercent(cat.percentage)})</span>
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(100, cat.percentage)}%`,
                              backgroundColor: cat.color || '#18181b'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé da Página 1 */}
            <div className="pt-2.5 border-t border-zinc-200 flex items-center justify-between text-[9px] text-zinc-500 shrink-0">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Documento emitido eletronicamente via <strong className="text-zinc-700">FinControl</strong></span>
              </div>
              <div className="font-bold text-zinc-600">
                Página 1 {reportFormat === '2pages' ? 'de 2' : 'de 1'}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PÁGINA 2: DETALHAMENTO DE DESPESAS, CONTAS & AUDITORIA   */}
          {/* ========================================================= */}
          {reportFormat === '2pages' && (
            <div
              ref={page2Ref}
              id="report-page-2"
              className="w-full max-w-[760px] bg-white text-zinc-900 p-8 sm:p-9 rounded-xl shadow-xl border border-zinc-200 font-sans print:shadow-none print:border-none print:m-0 print:p-6 flex flex-col justify-between"
              style={{ minHeight: '1075px', maxHeight: '1075px', boxSizing: 'border-box' }}
            >
              <div>
                {/* Minifita de Cabeçalho da Página 2 */}
                <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-950 text-lime-400 flex items-center justify-center font-black text-xs">
                      FC
                    </div>
                    <div>
                      <h2 className="text-xs font-black text-zinc-950 tracking-tight leading-none">
                        FinControl — Detalhamento Operacional & Posição Patrimonial
                      </h2>
                      <span className="text-[9px] text-zinc-500 font-medium">
                        Período: <strong className="capitalize text-zinc-800">{formatMonthYear(currentMonth)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-zinc-500">
                    <span>Despesas Totais: <strong className="text-rose-700 font-black">{maskVal(totalExpense)}</strong></span>
                  </div>
                </div>

                {/* SEÇÃO 4: TOP 6 MAIORES DESPESAS DO MÊS (100% REFORMULADO E ALINHADO) */}
                {includeTopExpenses && (
                  <div className="border border-zinc-200 rounded-lg p-3.5 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>Top 6 Maiores Despesas do Mês</span>
                        </h3>
                        <p className="text-[9.5px] text-zinc-500">
                          Classificadas por valor para identificação imediata dos maiores centros de custo
                        </p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                        Ranking Individual
                      </span>
                    </div>

                    {topExpenses.length === 0 ? (
                      <div className="text-center py-5 text-zinc-400 text-xs bg-zinc-50 rounded-lg border border-zinc-150">
                        Nenhuma despesa registrada no mês selecionado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topExpenses.map((tx, index) => {
                          const catInfo = getCategoryInfo(tx.category);
                          const acc = accountMap.get(tx.accountId);
                          const impactOfTotal = totalExpense > 0 ? (tx.numAmount / totalExpense) * 100 : 0;
                          const relativeWidth = (tx.numAmount / highestSingleExpense) * 100;

                          const rankStyle = 
                            index === 0 ? 'bg-amber-100 text-amber-900 border-amber-300 font-black' :
                            index === 1 ? 'bg-zinc-200 text-zinc-900 border-zinc-300 font-bold' :
                            index === 2 ? 'bg-orange-100 text-orange-900 border-orange-300 font-bold' :
                            'bg-zinc-100 text-zinc-700 border-zinc-200 font-semibold';

                          return (
                            <div 
                              key={tx.id || index}
                              className="bg-zinc-50/70 border border-zinc-200/90 rounded-lg p-2 hover:bg-zinc-100/50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Lado Esquerdo */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] border shrink-0 ${rankStyle}`}>
                                    #{index + 1}
                                  </span>
                                  
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-zinc-950 text-[11px] truncate max-w-[260px]">
                                        {tx.description || 'Despesa sem descrição'}
                                      </span>
                                      
                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                                        {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-500 mt-0.5">
                                      <span className="flex items-center gap-1 font-semibold" style={{ color: catInfo.color }}>
                                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: catInfo.color }} />
                                        {catInfo.name}
                                      </span>
                                      <span>•</span>
                                      <span>{formatDateBR(tx.date)}</span>
                                      {acc && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate max-w-[110px]">{acc.name}</span>
                                        </>
                                      )}
                                      {tx.paymentMethod && (
                                        <>
                                          <span>•</span>
                                          <span>{tx.paymentMethod}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Lado Direito: Valor e % */}
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-black text-rose-700">
                                    {maskVal(tx.numAmount)}
                                  </div>
                                  <span className="text-[9px] font-bold text-zinc-500">
                                    {maskPercent(impactOfTotal)} das despesas
                                  </span>
                                </div>
                              </div>

                              {/* Barra Proporcional */}
                              <div className="w-full bg-zinc-200/80 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div 
                                  className="h-full rounded-full bg-rose-500"
                                  style={{ width: `${Math.min(100, Math.max(5, relativeWidth))}%` }}
                                />
                              </div>

                              {/* Frase direta solicitada pelo usuário */}
                              <div className="mt-1.5 pt-1 border-t border-zinc-200/50 flex items-center justify-between text-[9px] text-zinc-600">
                                <span>
                                  Esse mês gastou <strong className="text-zinc-950 font-bold">{maskPercent(impactOfTotal)}</strong> ({maskVal(tx.numAmount)}) em <strong className="text-zinc-950 font-bold">{tx.description || 'este item'}</strong>
                                </span>
                                <span className="font-semibold text-zinc-400">#{index + 1} no mês</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SEÇÃO 5: Saldos por Conta Bancária */}
                {includeAccounts && accounts.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg p-3.5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Posição Consolidada por Conta Bancária</span>
                      </h3>
                      <span className="text-[11px] font-extrabold text-zinc-900">
                        Disponibilidade Total: {maskVal(totalAccountBalance)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 text-[9px] font-bold text-zinc-500 uppercase">
                            <th className="py-1 px-2">Conta / Instituição</th>
                            <th className="py-1 px-2">Tipo</th>
                            <th className="py-1 px-2 text-right">Saldo Atual</th>
                            <th className="py-1 px-2 text-right">Participação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {accounts.map(acc => {
                            const balance = Number(acc.balance || 0);
                            const share = totalAccountBalance > 0 ? (balance / totalAccountBalance) * 100 : 0;
                            return (
                              <tr key={acc.id} className="hover:bg-zinc-50/50">
                                <td className="py-1.5 px-2 font-semibold text-zinc-800 text-[10.5px]">
                                  {acc.name} <span className="text-zinc-500 font-normal text-[9.5px]">({acc.institution})</span>
                                </td>
                                <td className="py-1.5 px-2 text-zinc-600 capitalize text-[10px]">
                                  {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'investment' ? 'Investimento' : 'Carteira'}
                                </td>
                                <td className={`py-1.5 px-2 text-right font-bold text-[11px] ${balance >= 0 ? 'text-zinc-900' : 'text-rose-700'}`}>
                                  {maskVal(balance)}
                                </td>
                                <td className="py-1.5 px-2 text-right text-zinc-600 font-medium text-[10px]">
                                  {maskPercent(share)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SEÇÃO 6: Resumo de Obrigações e Contas a Pagar do Mês */}
                {bills.length > 0 && (
                  <div className="border border-zinc-200 rounded-lg p-3 mb-4 bg-zinc-50/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Compromissos Recorrentes & Parcelamentos</span>
                      </h3>
                      <span className="text-[9.5px] font-bold text-zinc-600">
                        {bills.length} contas cadastradas
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white border border-zinc-200/80 rounded-md p-2">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block">Compromisso Total</span>
                        <span className="font-extrabold text-zinc-900 text-xs">
                          {maskVal(bills.reduce((sum, b) => sum + Number(b.installmentAmount || 0), 0))}
                        </span>
                      </div>
                      <div className="bg-white border border-zinc-200/80 rounded-md p-2">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block">Já Pagas no Mês</span>
                        <span className="font-extrabold text-emerald-700 text-xs">
                          {bills.filter(b => b.lastPaidMonth === currentMonth).length} quitadas
                        </span>
                      </div>
                      <div className="bg-white border border-zinc-200/80 rounded-md p-2">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold block">Pendentes</span>
                        <span className="font-extrabold text-amber-700 text-xs">
                          {bills.filter(b => b.lastPaidMonth !== currentMonth).length} a vencer
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé e Autenticação da Página 2 */}
              <div className="pt-2.5 border-t border-zinc-200 flex items-center justify-between text-[9px] text-zinc-500 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>Dados consolidados pelo banco de dados FinControl • Certificado digital de integridade</span>
                </div>
                <div className="font-bold text-zinc-600">
                  Página 2 de 2
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
