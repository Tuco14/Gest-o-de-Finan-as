import React, { useRef, useState } from 'react';
import { Transaction, Account, Category, FinancialGoal } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Shield, 
  Building2,
  PieChart as PieIcon,
  Loader2
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
  userEmail,
  onToast,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeTopExpenses, setIncludeTopExpenses] = useState(true);
  const [hideSensitiveValues, setHideSensitiveValues] = useState(false);

  if (!isOpen) return null;

  // Filtragem dos dados do mês
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  
  const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));
  const accountMap = new Map<string, Account>(accounts.map(a => [a.id, a]));

  // Cálculos consolidados
  let totalIncome = 0;
  let paidIncome = 0;
  let pendingIncome = 0;

  let totalExpense = 0;
  let paidExpense = 0;
  let pendingExpense = 0;

  const categoryExpenses: Record<string, number> = {};

  monthTransactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (t.status === 'paid') paidIncome += t.amount;
      else pendingIncome += t.amount;
    } else {
      totalExpense += t.amount;
      if (t.status === 'paid') paidExpense += t.amount;
      else pendingExpense += t.amount;
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;
  const totalAccountBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Ordenar categorias por maior despesa
  const sortedCategories = Object.entries(categoryExpenses)
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        id: catId,
        name: cat?.name || 'Outros',
        color: cat?.color || '#a1a1aa',
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Maiores despesas individuais
  const topExpenses = [...monthTransactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Regra 50/30/20
  let needs = 0;
  let wants = 0;
  Object.entries(categoryExpenses).forEach(([catId, amt]) => {
    if (['cat-moradia', 'cat-alimentacao', 'cat-transporte', 'cat-saude'].includes(catId)) {
      needs += amt;
    } else {
      wants += amt;
    }
  });
  const needsPercent = totalIncome > 0 ? (needs / totalIncome) * 100 : 0;
  const wantsPercent = totalIncome > 0 ? (wants / totalIncome) * 100 : 0;

  // Gerar e baixar arquivo PDF formatado
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);

    try {
      // Configurar opções do html2canvas para renderização nítida
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Maior DPI para texto nítido
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar primeira página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Se o relatório for mais longo que uma página A4, adiciona as páginas seguintes
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `FinControl-Resumo-Mensal-${currentMonth}.pdf`;
      pdf.save(fileName);
      onToast('PDF do Resumo Mensal baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      onToast('Não foi possível gerar o arquivo PDF. Tente a opção de Imprimir.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Exportar Resumo Mensal em PDF
              </h2>
              <p className="text-[11px] text-zinc-400">
                Relatório executivo formatado com gráficos, saldos e indicadores de {formatMonthYear(currentMonth)}
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

        {/* Opções de Personalização do Relatório */}
        <div className="px-6 py-2.5 bg-zinc-850/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">Incluir no PDF:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAccounts}
                onChange={e => setIncludeAccounts(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
              />
              <span>Saldos de Contas</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTopExpenses}
                onChange={e => setIncludeTopExpenses(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-lime-400 accent-lime-400 cursor-pointer"
              />
              <span>Maiores Despesas</span>
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

        {/* Área de Visualização do Relatório Formatado (Documento A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/90 flex justify-center">
          <div
            ref={reportRef}
            id="report-printable-area"
            className="w-full max-w-[780px] bg-white text-zinc-900 p-8 sm:p-10 rounded-xl shadow-xl border border-zinc-200 font-sans print:shadow-none print:border-none print:m-0 print:p-6"
            style={{ minHeight: '1000px' }}
          >
            {/* Cabeçalho do Documento */}
            <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-zinc-950 text-lime-400 flex items-center justify-center font-black text-sm">
                    FC
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-zinc-950 tracking-tight leading-none">
                      FinControl
                    </h1>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Gestão Financeira Inteligente
                    </span>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-zinc-800 mt-2">
                  Relatório Executivo Mensal
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-600 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Período de Referência: <strong className="text-zinc-900 capitalize">{formatMonthYear(currentMonth)}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-lime-100 text-lime-900 text-[11px] font-extrabold rounded-md uppercase tracking-wider mb-2 border border-lime-300">
                  {netBalance >= 0 ? 'Superávit Consolidado' : 'Déficit no Período'}
                </span>
                <p className="text-[11px] text-zinc-500">
                  Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {userEmail && (
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Titular: {userEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Grid 4 Cards de Principais Saldos e Métricas */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {/* Receitas */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Receitas</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-base font-extrabold text-emerald-700">
                  {maskVal(totalIncome)}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 flex justify-between">
                  <span>Recebido: {maskVal(paidIncome)}</span>
                  <span>Prev: {maskVal(pendingIncome)}</span>
                </div>
              </div>

              {/* Despesas */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Despesas</span>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-base font-extrabold text-rose-700">
                  {maskVal(totalExpense)}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 flex justify-between">
                  <span>Pago: {maskVal(paidExpense)}</span>
                  <span>A pagar: {maskVal(pendingExpense)}</span>
                </div>
              </div>

              {/* Saldo Líquido do Mês */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Resultado Líquido</span>
                  <PiggyBank className="w-3.5 h-3.5 text-zinc-700" />
                </div>
                <div className={`text-base font-extrabold ${netBalance >= 0 ? 'text-zinc-900' : 'text-rose-700'}`}>
                  {netBalance >= 0 ? `+${maskVal(netBalance)}` : maskVal(netBalance)}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1">
                  Taxa Poupança: <strong className="text-zinc-800">{maskPercent(savingsRate)}</strong>
                </div>
              </div>

              {/* Patrimônio em Contas */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Saldo em Contas</span>
                  <Wallet className="w-3.5 h-3.5 text-zinc-700" />
                </div>
                <div className="text-base font-extrabold text-zinc-900">
                  {maskVal(totalAccountBalance)}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1">
                  {accounts.length} contas bancárias ativas
                </div>
              </div>
            </div>

            {/* Gráficos do Resumo Mensal */}
            <div className="grid grid-cols-2 gap-5 mb-6">
              
              {/* Gráfico 1: Balanço Visual Proporcional Receita vs Despesa */}
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">
                      Balanço de Fluxo no Mês
                    </h3>
                    <span className="text-[10px] font-bold text-zinc-500">
                      {monthTransactions.length} lançamentos
                    </span>
                  </div>

                  {/* Comparativo de Barras */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-700">Entradas / Receitas</span>
                        <span className="font-bold text-emerald-700">{maskVal(totalIncome)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 50}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-700">Saídas / Despesas</span>
                        <span className="font-bold text-rose-700">{maskVal(totalExpense)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 50}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Síntese percentual */}
                <div className="mt-4 pt-3 border-t border-zinc-200 flex justify-between items-center text-[11px]">
                  <span className="text-zinc-600">Eficiência de Poupança:</span>
                  <span className="font-bold text-zinc-900">
                    {maskPercent(savingsRate)} do total ganho guardado
                  </span>
                </div>
              </div>

              {/* Gráfico 2: Metodologia de Equilíbrio 50 / 30 / 20 */}
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">
                      Equilíbrio de Gastos (50/30/20)
                    </h3>
                    <span className="text-[10px] font-bold text-zinc-500">Benchmark</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-zinc-600">Necessidades Essenciais (Meta: 50%)</span>
                        <span className="font-bold text-zinc-900">{maskPercent(needsPercent)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${needsPercent <= 55 ? 'bg-zinc-800' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, needsPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-zinc-600">Desejos & Lazer (Meta: 30%)</span>
                        <span className="font-bold text-zinc-900">{maskPercent(wantsPercent)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${wantsPercent <= 35 ? 'bg-zinc-800' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, wantsPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-zinc-600">Poupança & Futuro (Meta: 20%)</span>
                        <span className="font-bold text-emerald-700">{maskPercent(savingsRate)}</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, savingsRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-200 text-[10px] text-zinc-500">
                  {savingsRate >= 20 ? '• Padrão de poupança exemplar no mês.' : '• Sugestão: reduzir gastos discricionários em 5%.'}
                </div>
              </div>
            </div>

            {/* Gráfico 3: Distribuição Detalhada de Despesas por Categoria */}
            <div className="border border-zinc-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PieIcon className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Distribuição de Gastos por Categoria</span>
                </h3>
                <span className="text-[11px] font-bold text-zinc-600">
                  Total Despesas: <strong className="text-zinc-900">{maskVal(totalExpense)}</strong>
                </span>
              </div>

              {sortedCategories.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">Nenhuma despesa registrada neste período.</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {sortedCategories.map(cat => (
                    <div key={cat.id} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-zinc-700 truncate max-w-[180px]">
                          {cat.name}
                        </span>
                        <span className="font-bold text-zinc-900">
                          {maskVal(cat.amount)} <span className="text-zinc-500 font-normal">({maskPercent(cat.percentage)})</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
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

            {/* Tabela de Saldos em Contas Bancárias (se ativado) */}
            {includeAccounts && (
              <div className="border border-zinc-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Posição Consolidada por Conta Bancária</span>
                  </h3>
                  <span className="text-xs font-extrabold text-zinc-900">
                    Disponibilidade Total: {maskVal(totalAccountBalance)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase">
                        <th className="py-1.5 px-2">Conta / Instituição</th>
                        <th className="py-1.5 px-2">Tipo</th>
                        <th className="py-1.5 px-2 text-right">Saldo Atual</th>
                        <th className="py-1.5 px-2 text-right">Participação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {accounts.map(acc => {
                        const share = totalAccountBalance > 0 ? (acc.balance / totalAccountBalance) * 100 : 0;
                        return (
                          <tr key={acc.id} className="hover:bg-zinc-50/50">
                            <td className="py-2 px-2 font-semibold text-zinc-800">
                              {acc.name} <span className="text-zinc-500 font-normal text-[11px]">({acc.institution})</span>
                            </td>
                            <td className="py-2 px-2 text-zinc-600 capitalize">
                              {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'investment' ? 'Investimento' : 'Carteira'}
                            </td>
                            <td className={`py-2 px-2 text-right font-bold ${acc.balance >= 0 ? 'text-zinc-900' : 'text-rose-700'}`}>
                              {maskVal(acc.balance)}
                            </td>
                            <td className="py-2 px-2 text-right text-zinc-600 font-medium">
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

            {/* Tabela de Maiores Despesas do Mês (se ativado) */}
            {includeTopExpenses && topExpenses.length > 0 && (
              <div className="border border-zinc-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Top 6 Maiores Despesas do Período</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500">Classificadas por valor</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase">
                        <th className="py-1.5 px-2">Data</th>
                        <th className="py-1.5 px-2">Descrição</th>
                        <th className="py-1.5 px-2">Categoria</th>
                        <th className="py-1.5 px-2">Método</th>
                        <th className="py-1.5 px-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {topExpenses.map(tx => {
                        const cat = categoryMap.get(tx.category);
                        return (
                          <tr key={tx.id} className="hover:bg-zinc-50/50">
                            <td className="py-2 px-2 text-zinc-600 whitespace-nowrap text-[11px]">
                              {tx.date.split('-').reverse().join('/')}
                            </td>
                            <td className="py-2 px-2 font-semibold text-zinc-900">
                              {tx.description}
                            </td>
                            <td className="py-2 px-2 text-zinc-600 text-[11px]">
                              {cat?.name || 'Outros'}
                            </td>
                            <td className="py-2 px-2 text-zinc-600 text-[11px]">
                              {tx.paymentMethod}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-rose-700">
                              {maskVal(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rodapé e Declaração de Auditoria */}
            <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-500">
              <div>
                Documento gerado eletronicamente pela plataforma <strong className="text-zinc-700">FinControl</strong>.
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Dados validados e auditados com segurança</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
