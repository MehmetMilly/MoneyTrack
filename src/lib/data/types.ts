// ============================================
// MoneyTrack — TypeScript Types
// ============================================

export interface Account {
  id: string;
  name: string;
  nameAr?: string;
  type: 'bank' | 'cash' | 'wallet' | 'investment' | 'savings';
  balance: number;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: string;
  toAccountId?: string; // for transfers
  categoryId: string;
  date: string;
  notes?: string;
  isRecurring: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  type: 'income' | 'expense';
  color: string;
}

export interface Debt {
  id: string;
  name: string;
  nameAr?: string;
  type: 'owed_by_me' | 'owed_to_me';
  totalAmount: number;
  paidAmount: number;
  creditor: string;
  creditorAr?: string;
  dueDate?: string;
  notes?: string;
  status: 'active' | 'paid' | 'overdue';
  payments: DebtPayment[];
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  accountId?: string;
  linkedTransactionId?: string;
}

export interface Installment {
  id: string;
  name: string;
  nameAr?: string;
  totalAmount: number;
  monthlyAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  startDate: string;
  nextDueDate: string;
  provider: string;
  providerAr?: string;
  status: 'active' | 'completed' | 'overdue';
  payments: InstallmentPayment[];
  notes?: string;
  createdAt: string;
}

export interface InstallmentPayment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'upcoming' | 'overdue';
  accountId?: string;
  linkedTransactionId?: string;
}

export interface Goal {
  id: string;
  name: string;
  nameAr?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  icon?: string;
  color: string;
  contributions: GoalContribution[];
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  type: 'manual' | 'scheduled';
  accountId?: string;
  linkedTransactionId?: string;
}

export interface Reminder {
  id: string;
  title: string;
  titleAr?: string;
  type: 'debt' | 'installment' | 'bill' | 'custom';
  referenceId?: string; // link to debt/installment
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'paid';
  isRecurring: boolean;
  paidDate?: string;
}

export type PlanningEntryKind = 'positive' | 'negative';

export type PlanningEntryStatus = 'expected' | 'confirmed' | 'cancelled';

export type PlanningEntryCategory =
  | 'bank_balance'
  | 'cash'
  | 'owed_to_me'
  | 'expected_profit'
  | 'sale'
  | 'salary'
  | 'gift'
  | 'expense'
  | 'debt_i_owe'
  | 'installment'
  | 'bill'
  | 'custom';

export interface PlanningEntry {
  id: string;
  kind: PlanningEntryKind;
  status: PlanningEntryStatus;
  category: PlanningEntryCategory;
  title: string;
  expectedAmount: number;
  actualAmount?: number;
  dueDate?: string;
  notes?: string;
  linkedAccountId?: string;
  linkedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'SAR';

export interface PlannerSettings {
  dashboardMode: 'planner' | 'finance';
  goalProgressMode: 'automatic' | 'manual_contributions';
  includeExpectedEntries: boolean;
  showAdvancedFinancePages: boolean;
  primaryGoalId?: string;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  currency: Currency;
  planner: PlannerSettings;
}

// Monthly summary type
export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}
