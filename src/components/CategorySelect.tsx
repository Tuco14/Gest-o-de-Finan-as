import React, { useState, useRef, useEffect } from 'react';
import { Category, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { generateId } from '../utils/formatters';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  ChevronDown, 
  Sparkles,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';

interface CategorySelectProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  transactionType: TransactionType;
  onAddCategory: (category: Category) => Promise<Category> | void;
  onDeleteCategory: (categoryId: string) => Promise<void> | void;
  error?: string;
}

const PALETTE = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EF4444', // Red
  '#64748B', // Slate
];

const ICONS = [
  'Tag', 'Utensils', 'Car', 'Home', 'HeartPulse', 
  'Sparkles', 'GraduationCap', 'Tv', 'Briefcase', 
  'Laptop', 'TrendingUp', 'CircleDollarSign', 'Wallet', 'CreditCard'
];

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  transactionType,
  onAddCategory,
  onDeleteCategory,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<TransactionType | 'both'>(transactionType);
  const [customIcon, setCustomIcon] = useState('Tag');
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Categorias compatíveis com o tipo de transação selecionado
  const filteredByType = categories.filter(
    c => c.type === transactionType || c.type === 'both'
  );

  // Categorias filtradas pela busca
  const searchResults = filteredByType.filter(c =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Categoria atualmente selecionada
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Verifica se o texto digitado já existe exatamente
  const trimmedSearch = searchQuery.trim();
  const exactMatchExists = categories.some(
    c => c.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setDeletingCatId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foco no input de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setIsCreatingCustom(false);
      setDeletingCatId(null);
    }
  }, [isOpen]);

  // Criação rápida de categoria a partir do texto digitado
  const handleQuickCreateCategory = async () => {
    if (!trimmedSearch) return;

    // Escolhe uma cor diferente com base no tamanho do nome
    const colorIndex = Math.abs(trimmedSearch.length) % PALETTE.length;
    const color = selectedColor || PALETTE[colorIndex];

    const newCat: Category = {
      id: `cat-${generateId()}`,
      name: trimmedSearch,
      type: transactionType,
      color,
      iconName: 'Tag',
      budgetMonthly: 0,
    };

    await onAddCategory(newCat);
    onSelectCategory(newCat.id);
    setSearchQuery('');
    setIsOpen(false);
  };

  // Criação detalhada de categoria
  const handleDetailedCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newCat: Category = {
      id: `cat-${generateId()}`,
      name: customName.trim(),
      type: customType,
      color: selectedColor,
      iconName: customIcon,
      budgetMonthly: 0,
    };

    await onAddCategory(newCat);
    onSelectCategory(newCat.id);
    setCustomName('');
    setIsCreatingCustom(false);
    setIsOpen(false);
  };

  // Exclusão de categoria
  const handleConfirmDelete = async (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteCategory(catId);
    setDeletingCatId(null);

    // Se a categoria apagada era a selecionada, seleciona a primeira restante
    if (selectedCategoryId === catId) {
      const remaining = categories.filter(c => c.id !== catId && (c.type === transactionType || c.type === 'both'));
      if (remaining.length > 0) {
        onSelectCategory(remaining[0].id);
      } else {
        onSelectCategory('');
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão Gatilho da Categoria */}
      <button
        type="button"
        id="category-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-zinc-800/90 hover:bg-zinc-800 border rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
          error ? 'border-rose-500 bg-rose-950/20' : isOpen ? 'border-lime-400 ring-2 ring-lime-400/20' : 'border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedCategory ? (
            <>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: selectedCategory.color || '#10B981' }}
              >
                <CategoryIcon name={selectedCategory.iconName || 'Tag'} className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-white text-xs truncate">
                {selectedCategory.name}
              </span>
            </>
          ) : (
            <span className="text-zinc-500 text-xs font-medium">
              Selecione ou crie uma categoria...
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180 text-lime-400' : ''}`} />
      </button>

      {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}

      {/* Dropdown Menu com Busca, Criação e Exclusão */}
      {isOpen && (
        <div 
          id="category-dropdown-popover"
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[380px]"
        >
          {/* Campo de Busca / Digitação de Nova Categoria */}
          <div className="p-2.5 border-b border-zinc-800 bg-zinc-950/80">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar ou escrever nova categoria..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-850 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Opção Rápida de Adicionar aos Fixos quando digitar um nome novo */}
          {trimmedSearch && !exactMatchExists && (
            <div className="p-2.5 bg-lime-950/30 border-b border-lime-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-lime-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                  Nova categoria detectada
                </span>
                <span className="text-[10px] text-zinc-400">Clique para salvar</span>
              </div>
              
              {/* Paleta rápida de cores para nova categoria */}
              <div className="flex items-center gap-1.5 mb-2 overflow-x-auto py-0.5">
                {PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-5 h-5 rounded-full shrink-0 transition-transform ${
                      selectedColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <button
                type="button"
                id="quick-add-category-btn"
                onClick={handleQuickCreateCategory}
                className="w-full py-2 px-3 bg-lime-400 hover:bg-lime-300 text-zinc-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-lime-400/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar "{trimmedSearch}" nas Categorias Fixas</span>
              </button>
            </div>
          )}

          {/* Modo de Criação Detalhada (Form) */}
          {isCreatingCustom ? (
            <form onSubmit={handleDetailedCreate} className="p-3 space-y-3 bg-zinc-850/70 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-lime-400" />
                  Criar Nova Categoria Fixa
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Farmácia, Pet Shop, Investimentos..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-lime-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                    Tipo
                  </label>
                  <select
                    value={customType}
                    onChange={e => setCustomType(e.target.value as TransactionType | 'both')}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                    Ícone
                  </label>
                  <select
                    value={customIcon}
                    onChange={e => setCustomIcon(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-hidden"
                  >
                    {ICONS.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                  Cor
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-5 h-5 rounded-full ${selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirmar e Adicionar Categoria
              </button>
            </form>
          ) : null}

          {/* Lista de Categorias com Opção de Selecionar e Apagar */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Categorias Fixas Disponíveis</span>
              <span>{searchResults.length} {searchResults.length === 1 ? 'item' : 'itens'}</span>
            </div>

            {searchResults.length === 0 && !trimmedSearch ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                Nenhuma categoria disponível para este tipo.
              </div>
            ) : null}

            {searchResults.map(cat => {
              const isSelected = cat.id === selectedCategoryId;
              const isConfirmingDelete = deletingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (!isConfirmingDelete) {
                      onSelectCategory(cat.id);
                      setIsOpen(false);
                    }
                  }}
                  className={`group px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color || '#10B981' }}
                    >
                      <CategoryIcon name={cat.iconName || 'Tag'} className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="truncate block">{cat.name}</span>
                      {cat.type === 'both' && (
                        <span className="text-[9px] text-zinc-500 font-normal">Receita/Despesa</span>
                      )}
                    </div>
                  </div>

                  {/* Ações: Seleção ou Exclusão */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {isSelected && !isConfirmingDelete && (
                      <Check className="w-4 h-4 text-lime-400 mr-1" />
                    )}

                    {/* Botão de Excluir Categoria */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-600/50 px-2 py-0.5 rounded-lg">
                        <span className="text-[10px] text-rose-300 font-semibold">Apagar?</span>
                        <button
                          type="button"
                          onClick={e => handleConfirmDelete(cat.id, e)}
                          className="px-1.5 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCatId(null)}
                          className="px-1 text-zinc-400 hover:text-white text-[10px] cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDeletingCatId(cat.id);
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={`Apagar categoria "${cat.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé: Botão para abrir criação detalhada */}
          {!isCreatingCustom && (
            <div className="p-2 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between">
              <button
                type="button"
                id="open-custom-category-form-btn"
                onClick={() => {
                  setCustomName(searchQuery);
                  setIsCreatingCustom(true);
                }}
                className="w-full py-1.5 px-3 text-zinc-400 hover:text-lime-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-850 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Categoria Personalizada</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
