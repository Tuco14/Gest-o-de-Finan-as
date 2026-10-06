export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type PaymentMethod = 'Pix' | 'Cartão' | 'Boleto' | 'Transferência' | 'Dinheiro';

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'both';
  color: string;
  iconName: string;
  budgetMonthly?: number;
}

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: 'checking' | 'credit' | 'savings' | 'investment' | 'cash';
  balance: number;
  color: string;
  iconName: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  status: TransactionStatus;
  accountId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  color: string;
}

export interface PayableBill {
  id: string;
  name: string;
  category?: string;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  dueDate: string; // YYYY-MM-DD
  notes?: string;
  color?: string;
  createdAt?: string;
  billType?: 'installment' | 'fixed'; // 'fixed' = conta fixa recorrente (água, luz, celular, etc.), 'installment' = parcelamento/financiamento
  lastPaidMonth?: string; // YYYY-MM do mês em que foi paga pela última vez
  iconName?: string; // Droplets, Zap, Smartphone, Wifi, Home, Tv, etc.
}

export interface FilterOptions {
  search: string;
  type: 'all' | TransactionType;
  categoryId: string;
  accountId: string;
  status: 'all' | TransactionStatus;
  dateRange: 'this-month' | 'last-month' | 'all' | 'custom';
}
