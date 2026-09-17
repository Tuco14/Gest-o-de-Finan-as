import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BarChart2, TrendingUp, Calendar } from 'lucide-react';

interface CashFlowChartProps {
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  privacyMode: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  transactions,
  currentMonth,
  privacyMode,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'daily' | 'accumulated'>('daily');

  // Obter dias do mês
  const { daysData, maxDailyVal, totalMonthIncome, totalMonthExpense } = useMemo(() => {
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map para acumular dia a dia
    const dailyMap: Record<number, { day: number; dateStr: string; income: number; expense: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
      dailyMap[d] = { day: d, dateStr: dStr, income: 0, expense: 0 };
    }

    let tIncome = 0;
    let tExpense = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonth)) {
        const day = parseInt(t.date.split('-')[2], 10);
        if (dailyMap[day]) {
          if (t.type === 'income') {
            dailyMap[day].income += t.amount;
            tIncome += t.amount;
          } else {
            dailyMap[day].expense += t.amount;
            tExpense += t.amount;
          }
        }
      }
    });

    // Converter para array
    let accBalance = 0;
    let maxVal = 100;

    const data = Object.values(dailyMap).map(item => {
      accBalance += item.income - item.expense;
      const peak = Math.max(item.income, item.expense, Math.abs(accBalance));
      if (peak > maxVal) maxVal = peak;
      return {
        ...item,
        accumulated: accBalance,
      };
    });

    return {
      daysData: data,
      maxDailyVal: maxVal * 1.15,
      totalMonthIncome: tIncome,
      totalMonthExpense: tExpense,
    };
  }, [transactions, currentMonth]);

  // SVG dimensions
  const width = 760;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const count = daysData.length;
  const stepX = count > 1 ? innerWidth / (count - 1) : innerWidth;

  // Gerar coordenadas dos pontos
  const points = daysData.map((d, i) => {
    const x = paddingX + i * stepX;
    const yIncome = height - paddingY - (d.income / (maxDailyVal || 1)) * innerHeight;
    const yExpense = height - paddingY - (d.expense / (maxDailyVal || 1)) * innerHeight;
    const yAcc = height - paddingY - (Math.max(0, d.accumulated) / (maxDailyVal || 1)) * innerHeight;
    return { x, yIncome, yExpense, yAcc, data: d };
  });

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-lime-400" />
            <h3 className="font-bold text-white text-base">Fluxo de Caixa Mensal</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Evolução de entradas e saídas ao longo dos {daysData.length} dias do mês
          </p>
        </div>

        {/* Chart View Toggle & Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-300">Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-zinc-300">Despesas</span>
            </div>
          </div>

          <div className="bg-zinc-800 p-1 rounded-xl flex items-center border border-zinc-700">
            <button
              id="chart-mode-daily"
              onClick={() => setChartMode('daily')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === 'daily'
                  ? 'bg-lime-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Diário
            </button>
            <button
              id="chart-mode-acc"
              onClick={() => setChartMode('accumulated')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === 'accumulated'
                  ? 'bg-lime-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Acumulado
            </button>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 min-w-[500px]"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="accAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A3E635" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#A3E635" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + innerHeight * ratio;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#27272A"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {chartMode === 'daily' ? (
            <>
              {/* Barras e pontos diários */}
              {points.map((p, idx) => {
                const barWidth = Math.max(3, (stepX * 0.6) / 2);
                return (
                  <g key={idx}>
                    {/* Barra de Receita */}
                    {p.data.income > 0 && (
                      <rect
                        x={p.x - barWidth - 1}
                        y={p.yIncome}
                        width={barWidth}
                        height={height - paddingY - p.yIncome}
                        rx="2"
                        fill="#10B981"
                        className="transition-all duration-300"
                      />
                    )}
                    {/* Barra de Despesa */}
                    {p.data.expense > 0 && (
                      <rect
                        x={p.x + 1}
                        y={p.yExpense}
                        width={barWidth}
                        height={height - paddingY - p.yExpense}
                        rx="2"
                        fill="#F43F5E"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Linha vertical de foco no hover */}
                    {hoveredIndex === idx && (
                      <line
                        x1={p.x}
                        y1={paddingY}
                        x2={p.x}
                        y2={height - paddingY}
                        stroke="#A3E635"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Trigger invisível para hover */}
                    <rect
                      x={p.x - stepX / 2}
                      y={0}
                      width={stepX}
                      height={height}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {/* Linha de Acumulado com Curva */}
              <path
                d={`M ${points.map(p => `${p.x} ${p.yAcc}`).join(' L ')}`}
                fill="none"
                stroke="#A3E635"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Preenchimento de Área */}
              <path
                d={`M ${points[0]?.x} ${height - paddingY} L ${points.map(p => `${p.x} ${p.yAcc}`).join(' L ')} L ${points[points.length - 1]?.x} ${height - paddingY} Z`}
                fill="url(#accAreaGrad)"
              />
              {points.map((p, idx) => (
                <g key={idx}>
                  {hoveredIndex === idx && (
                    <circle cx={p.x} cy={p.yAcc} r="5" fill="#A3E635" stroke="#18181B" strokeWidth="2" />
                  )}
                  <rect
                    x={p.x - stepX / 2}
                    y={0}
                    width={stepX}
                    height={height}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                  />
                </g>
              ))}
            </>
          )}

          {/* Eixo X - Marcadores de dias */}
          {points.map((p, idx) => {
            const showLabel = p.data.day === 1 || p.data.day % 5 === 0 || p.data.day === daysData.length;
            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#71717A"
                fontWeight="500"
              >
                Dia {p.data.day}
              </text>
            );
          })}
        </svg>

        {/* Tooltip flutuante */}
        {activePoint && (
          <div
            className="absolute top-2 pointer-events-none transition-all duration-150 transform -translate-x-1/2 bg-zinc-950 text-white rounded-xl py-2.5 px-3.5 shadow-2xl text-xs z-10 min-w-[160px] border border-zinc-700"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
            }}
          >
            <div className="flex items-center gap-1.5 text-zinc-400 font-medium border-b border-zinc-800 pb-1.5 mb-1.5">
              <Calendar className="w-3 h-3 text-lime-400" />
              <span>Dia {activePoint.data.day} de {currentMonth}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-emerald-400">Receitas:</span>
                <span className="font-semibold">{formatCurrency(activePoint.data.income, privacyMode)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-rose-400">Despesas:</span>
                <span className="font-semibold">{formatCurrency(activePoint.data.expense, privacyMode)}</span>
              </div>
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-zinc-800">
                <span className="text-zinc-300">Balanço Acumulado:</span>
                <span className={`font-bold ${activePoint.data.accumulated >= 0 ? 'text-lime-400' : 'text-rose-400'}`}>
                  {formatCurrency(activePoint.data.accumulated, privacyMode)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumo do mês no rodapé do gráfico */}
      <div className="mt-4 pt-3 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-zinc-400">
        <div>
          <span className="text-zinc-500 block">Total Recebido</span>
          <span className="font-bold text-emerald-400 text-sm">{formatCurrency(totalMonthIncome, privacyMode)}</span>
        </div>
        <div>
          <span className="text-zinc-500 block">Total Gasto</span>
          <span className="font-bold text-rose-400 text-sm">{formatCurrency(totalMonthExpense, privacyMode)}</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-zinc-500 block">Saldo Operacional</span>
          <span className={`font-bold text-sm ${totalMonthIncome - totalMonthExpense >= 0 ? 'text-lime-400' : 'text-rose-400'}`}>
            {formatCurrency(totalMonthIncome - totalMonthExpense, privacyMode)}
          </span>
        </div>
      </div>
    </div>
  );
};
