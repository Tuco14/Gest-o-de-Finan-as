import { Category, Account, Transaction, FinancialGoal } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Despesas
  { id: 'cat-moradia', name: 'Moradia & Contas', type: 'expense', color: '#6366F1', iconName: 'Home', budgetMonthly: 0 },
  { id: 'cat-alimentacao', name: 'Alimentação & Supermercado', type: 'expense', color: '#F59E0B', iconName: 'Utensils', budgetMonthly: 0 },
  { id: 'cat-transporte', name: 'Transporte & Combustível', type: 'expense', color: '#3B82F6', iconName: 'Car', budgetMonthly: 0 },
  { id: 'cat-saude', name: 'Saúde & Cuidados', type: 'expense', color: '#EC4899', iconName: 'HeartPulse', budgetMonthly: 0 },
  { id: 'cat-lazer', name: 'Lazer & Restaurantes', type: 'expense', color: '#8B5CF6', iconName: 'Sparkles', budgetMonthly: 0 },
  { id: 'cat-educacao', name: 'Educação & Livros', type: 'expense', color: '#10B981', iconName: 'GraduationCap', budgetMonthly: 0 },
  { id: 'cat-assinaturas', name: 'Assinaturas & Serviços', type: 'expense', color: '#06B6D4', iconName: 'Tv', budgetMonthly: 0 },
  { id: 'cat-outros-desp', name: 'Outras Despesas', type: 'expense', color: '#64748B', iconName: 'Layers', budgetMonthly: 0 },

  // Receitas
  { id: 'cat-salario', name: 'Salário & Pró-labore', type: 'income', color: '#10B981', iconName: 'Briefcase' },
  { id: 'cat-freelance', name: 'Freelance & Projetos', type: 'income', color: '#059669', iconName: 'Laptop' },
  { id: 'cat-investimentos', name: 'Rendimentos & Dividendos', type: 'income', color: '#0D9488', iconName: 'TrendingUp' },
  { id: 'cat-outros-rec', name: 'Outras Receitas', type: 'income', color: '#14B8A6', iconName: 'CircleDollarSign' },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-corrente', name: 'Conta Corrente Principal', institution: 'Banco Principal', type: 'checking', balance: 0, color: '#3B82F6', iconName: 'Landmark' },
  { id: 'acc-cartao', name: 'Cartão de Crédito', institution: 'Cartão', type: 'credit', balance: 0, color: '#6366F1', iconName: 'CreditCard' },
  { id: 'acc-reserva', name: 'Reserva / Poupança', institution: 'Investimentos', type: 'savings', balance: 0, color: '#10B981', iconName: 'ShieldCheck' },
  { id: 'acc-carteira', name: 'Carteira (Dinheiro Físico)', institution: 'Espécie', type: 'cash', balance: 0, color: '#64748B', iconName: 'Wallet' },
];

export const INITIAL_GOALS: FinancialGoal[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

