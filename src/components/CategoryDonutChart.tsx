import React, { useState, useMemo } from 'react';
import { Category, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { PieChart, ArrowUpRight } from 'lucide-react';

interface CategoryDonutChartProps {
  categories: Category[];
  transactions: Transaction[];
  currentMonth: string;
  privacyMode: boolean;
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  transactions,
  currentMonth,
  privacyMode,
  onSelectCategory,
}) => {
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  // Calcular totais por categoria de despesa no mês selecionado
  const { catData, totalExpense } = useMemo(() => {
    const expenses = transactions.filter(
      t => t.type === 'expense' && t.date.startsWith(currentMonth)
    );

    const map: Record<string, number> = {};
    let sum = 0;

    expenses.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      sum += t.amount;
    });

    const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));

    const list = Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categoryMap.get(catId);
        return {
          catId,
          name: cat?.name || 'Outros',
          color: cat?.color || '#94A3B8',
          iconName: cat?.iconName || 'Layers',
          amount,
          percent: sum > 0 ? (amount / sum) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { catData: list, totalExpense: sum };
  }, [categories, transactions, currentMonth]);

  // Se não houver despesas
  if (catData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center h-full min-h-[320px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-slate-800 text-sm">Sem despesas registradas</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Nenhuma despesa foi lançada para o mês selecionado. Adicione novas transações para visualizar o gráfico.
        </p>
      </div>
    );
  }

  // Geometria do Donut SVG
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Gerar arcos acumulados
  let accumulatedPercent = 0;
  const arcs = catData.map(item => {
    const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percent;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeCategory = hoveredCatId ? catData.find(c => c.catId === hoveredCatId) : null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <PieChart className="w-5 h-5 text-lime-400" />
            <span>Despesas por Categoria</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Distribuição do seu custo de vida no mês</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
          {catData.length} categorias
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto">
        {/* SVG Donut Center */}
        <div className="md:col-span-6 flex justify-center relative select-none">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#27272A"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Arcos de categorias */}
            {arcs.map(arc => {
              const isHovered = hoveredCatId === arc.catId;
              return (
                <circle
                  key={arc.catId}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={arc.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredCatId(arc.catId)}
                  onMouseLeave={() => setHoveredCatId(null)}
                  onClick={() => onSelectCategory?.(arc.catId)}
                />
              );
            })}
          </svg>

          {/* Centro do Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeCategory ? (
              <>
                <span className="text-[11px] font-semibold text-zinc-400 line-clamp-1 max-w-[120px]">
                  {activeCategory.name}
                </span>
                <span className="text-sm font-bold text-white mt-0.5">
                  {formatCurrency(activeCategory.amount, privacyMode)}
                </span>
                <span className="text-xs font-bold text-lime-400 mt-0.5">
                  {activeCategory.percent.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Total Despesas
                </span>
                <span className="text-base font-bold text-white mt-0.5">
                  {formatCurrency(totalExpense, privacyMode)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Passe o mouse</span>
              </>
            )}
          </div>
        </div>

        {/* Lista de Categorias com barras */}
        <div className="md:col-span-6 space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {catData.map(cat => {
            const isHovered = hoveredCatId === cat.catId;
            return (
              <div
                key={cat.catId}
                onMouseEnter={() => setHoveredCatId(cat.catId)}
                onMouseLeave={() => setHoveredCatId(null)}
                onClick={() => onSelectCategory?.(cat.catId)}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isHovered
                    ? 'bg-zinc-800 border-zinc-600 shadow-sm'
                    : 'border-transparent hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.iconName} className="w-3 h-3" />
                    </div>
                    <span className="font-medium text-zinc-200 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-white">
                      {formatCurrency(cat.amount, privacyMode)}
                    </span>
                    <span className="text-zinc-400 font-medium text-[11px] w-9 text-right">
                      {cat.percent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Mini barra de progresso */}
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percent}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
