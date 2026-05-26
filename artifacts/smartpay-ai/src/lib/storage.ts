import { v4 as uuidv4 } from 'uuid';

export type PayApp = 'gpay' | 'phonepe' | 'paytm' | 'upi';

export interface Settings {
  monthlyBudget: number;
  categories: string[];
  onboarded: boolean;
  preferredPayApp: PayApp | '';
  payAppName: string;
  userName: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface CategoryBudget {
  category: string;
  budget: number;
}

export interface MonthBudget {
  totalBudget: number;
  categoryBudgets: CategoryBudget[];
}

const DEFAULT_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Others'];

const DEFAULT_SETTINGS: Settings = {
  monthlyBudget: 50000,
  categories: DEFAULT_CATEGORIES,
  onboarded: false,
  preferredPayApp: '',
  payAppName: '',
  userName: '',
};

function normalisePayee(payee: string): string {
  const v = payee.trim();
  // 10-digit mobile: use @upi handle (NPCI-registered, works across apps)
  // Do NOT prepend 91 — that produces an invalid VPA
  if (/^\d{10}$/.test(v)) return `${v}@upi`;
  return v;
}

/**
 * Build an app-specific UPI deep link.
 * Falls back to the standard upi://pay scheme if app is missing/unrecognised.
 */
export function buildPaymentLink(
  app: PayApp | '',
  payee: string,
  amount: number,
  tn = '',
  pn = '',
): string {
  const pa = normalisePayee(payee);
  const appSchemes: Record<string, string> = {
    gpay:    'gpay://upi/pay',
    phonepe: 'phonepe://pay',
    paytm:   'paytmmp://pay',
    upi:     'upi://pay',
  };
  const scheme = (app && appSchemes[app]) ? appSchemes[app] : 'upi://pay';
  const p = new URLSearchParams({ pa, am: amount.toFixed(2), cu: 'INR' });
  if (pn) p.set('pn', pn);
  if (tn) p.set('tn', tn);
  return `${scheme}?${p.toString()}`;
}

/**
 * Always-reliable fallback using the standard UPI intent scheme.
 * Android will show an app-chooser; works even if the preferred app is not installed.
 */
export function buildFallbackUpiLink(
  payee: string,
  amount: number,
  tn = '',
  pn = '',
): string {
  const pa = normalisePayee(payee);
  const p = new URLSearchParams({ pa, am: amount.toFixed(2), cu: 'INR' });
  if (pn) p.set('pn', pn);
  if (tn) p.set('tn', tn);
  return `upi://pay?${p.toString()}`;
}

export function buildAppOpenLink(app: PayApp | ''): string {
  const schemes: Record<string, string> = {
    gpay:    'gpay://',
    phonepe: 'phonepe://',
    paytm:   'paytmmp://',
    upi:     'upi://pay',
  };
  return schemes[app || ''] || 'upi://pay';
}

export function getSettings(): Settings {
  try {
    const data = localStorage.getItem('smartpay_settings');
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error reading settings', e);
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
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading transactions', e);
  }
  return [];
}

export function getTransactionsByMonth(month: number, year: number): Transaction[] {
  const all = getAllTransactions();
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return all
    .filter(t => {
      const time = new Date(t.date).getTime();
      return time >= start && time <= end;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getMonthTransactions(): Transaction[] {
  const now = new Date();
  return getTransactionsByMonth(now.getMonth(), now.getFullYear());
}

export function getMonthlySpend(): number {
  return getMonthTransactions().reduce((sum, t) => sum + t.amount, 0);
}

export function getSpendForMonth(month: number, year: number): number {
  return getTransactionsByMonth(month, year).reduce((sum, t) => sum + t.amount, 0);
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
  localStorage.removeItem('smartpay_budgets');
}

export function getMonthBudget(month: number, year: number): MonthBudget {
  try {
    const key = `smartpay_budget_${year}_${month}`;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading budget', e);
  }
  const settings = getSettings();
  return {
    totalBudget: settings.monthlyBudget,
    categoryBudgets: settings.categories.map(c => ({ category: c, budget: 0 })),
  };
}

export function saveMonthBudget(month: number, year: number, budget: MonthBudget) {
  const key = `smartpay_budget_${year}_${month}`;
  localStorage.setItem(key, JSON.stringify(budget));
}

export type BudgetAlertKind = 'none' | 'over_budget' | 'no_budget';

export interface BudgetAlertInfo {
  kind: BudgetAlertKind;
  category: string;
  spent: number;
  budget: number;
}

export function checkBudgetAlert(category: string): BudgetAlertInfo {
  const now = new Date();
  const monthBudget = getMonthBudget(now.getMonth(), now.getFullYear());
  const catEntry = monthBudget.categoryBudgets.find(c => c.category === category);
  const catBudgetAmount = catEntry?.budget ?? 0;

  const txns = getTransactionsByMonth(now.getMonth(), now.getFullYear());
  const catSpent = txns
    .filter(t => t.category === category)
    .reduce((s, t) => s + t.amount, 0);

  if (catBudgetAmount === 0) return { kind: 'no_budget', category, spent: catSpent, budget: 0 };
  if (catSpent > catBudgetAmount) return { kind: 'over_budget', category, spent: catSpent, budget: catBudgetAmount };
  return { kind: 'none', category, spent: catSpent, budget: catBudgetAmount };
}
