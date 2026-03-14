import { v4 as uuidv4 } from 'uuid';

export interface Settings {
  monthlyBudget: number;
  categories: string[];
  onboarded: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
}

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Others'];

const DEFAULT_SETTINGS: Settings = {
  monthlyBudget: 10000,
  categories: DEFAULT_CATEGORIES,
  onboarded: false,
};

export function getSettings(): Settings {
  try {
    const data = localStorage.getItem('smartpay_settings');
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Error reading settings", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Partial<Settings>) {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('smartpay_settings', JSON.stringify(updated));
  return updated;
}

export function getAllTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem('smartpay_transactions');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading transactions", e);
  }
  return [];
}

export function getMonthTransactions(): Transaction[] {
  const all = getAllTransactions();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  return all
    .filter(t => {
      const time = new Date(t.date).getTime();
      return time >= startOfMonth && time <= endOfMonth;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getMonthlySpend(): number {
  const txs = getMonthTransactions();
  return txs.reduce((sum, t) => sum + t.amount, 0);
}

export function addTransaction(data: Omit<Transaction, 'id' | 'date'>) {
  const newTx: Transaction = {
    ...data,
    id: uuidv4(),
    date: new Date().toISOString(),
  };
  const all = getAllTransactions();
  all.push(newTx);
  localStorage.setItem('smartpay_transactions', JSON.stringify(all));
  return newTx;
}

export function deleteTransaction(id: string) {
  const all = getAllTransactions();
  const filtered = all.filter(t => t.id !== id);
  localStorage.setItem('smartpay_transactions', JSON.stringify(filtered));
}

export function clearAllData() {
  localStorage.removeItem('smartpay_settings');
  localStorage.removeItem('smartpay_transactions');
}
