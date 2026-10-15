import Debts from './Debts';
import Goals from './Goals';
import AnalysisDashboard from './AnalysisDashboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  LayoutDashboard,
  ReceiptText,
  ChartNoAxesCombined,
  Settings,
  Trash2,
  X,
  Download,
  Upload,
  Sun,
  Moon,
  UserRound,
} from 'lucide-react';

type Account = {
  id: string;
  name: string;
  balance: number;
};

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  date: string;
};

type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
type Theme = 'dark' | 'light';
type Tab = 'home' | 'transactions' | 'analysis' | 'more' | 'debts' | 'goals';

type BackupData = {
  app: 'Monevo';
  version: 1;
  exportedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  profileName: string;
  currency: Currency;
  theme: Theme;
};

const defaultAccounts: Account[] = [
  { id: 'bank', name: 'Main Bank', balance: 5000 },
  { id: 'savings', name: 'Savings', balance: 2000 },
  { id: 'crypto', name: 'Crypto Wallet', balance: 1500 },
  { id: 'cash', name: 'Cash', balance: 300 },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function isCurrency(value: unknown): value is Currency {
  return ['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(String(value));
}

function isAccount(value: unknown): value is Account {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    typeof item.balance === 'number' &&
    Number.isFinite(item.balance) &&
    item.balance >= 0
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    typeof item.amount === 'number' &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    (item.type === 'income' || item.type === 'expense') &&
    typeof item.accountId === 'string' &&
    item.accountId.length > 0 &&
    typeof item.date === 'string' &&
    !Number.isNaN(Date.parse(item.date))
  );
}

function App() {
  const [accounts, setAccounts] = useState<Account[]>(() =>
    readStorage('monevo_accounts', defaultAccounts),
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    readStorage('monevo_transactions', []),
  );
  const [tab, setTab] = useState<Tab>('home');
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(() => {
    const initial = readStorage<Account[]>('monevo_accounts', defaultAccounts);
    return initial[0]?.id ?? 'bank';
  });
  const [newAccount, setNewAccount] = useState('');
  const [notice, setNotice] = useState('');

  const [renameTarget, setRenameTarget] = useState<Account | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [balanceTarget, setBalanceTarget] = useState<Account | null>(null);
  const [balanceValue, setBalanceValue] = useState('');

  const [profileName, setProfileName] = useState<string>(() =>
    readStorage('monevo_profile_name', ''),
  );
  const [currency, setCurrency] = useState<Currency>(() =>
    readStorage('monevo_currency', 'USD'),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    readStorage('monevo_theme', 'dark'),
  );

  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('monevo_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('monevo_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('monevo_profile_name', JSON.stringify(profileName));
  }, [profileName]);

  useEffect(() => {
    localStorage.setItem('monevo_currency', JSON.stringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('monevo_theme', JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0b0d10' : '#f7f8fa');
    }
  }, [theme]);

  // If the current accountId no longer exists (e.g. after restore), snap to first valid.
  useEffect(() => {
    if (accounts.length === 0) return;
    if (!accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const total = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  const isDark = theme === 'dark';

  const surface = isDark
    ? 'border-white/10 bg-[#121519] text-slate-100'
    : 'border-slate-200 bg-white text-slate-900 shadow-sm';

  const mutedText = isDark ? 'opacity-60' : 'text-slate-500';

  const inputClass = `w-full rounded-xl border px-4 py-3 outline-none focus:border-lime-400 ${
    isDark
      ? 'border-white/10 bg-black/20 text-white'
      : 'border-slate-200 bg-white text-slate-900'
  }`;

  function addTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(amount);
    const selectedAccount = accounts.find((a) => a.id === accountId);

    if (!title.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice('Enter a description and a valid amount.');
      return;
    }

    if (!selectedAccount) {
      setNotice('Please select an account.');
      return;
    }

    if (type === 'expense' && selectedAccount.balance < value) {
      setNotice('Not enough money in this account.');
      return;
    }

    setTransactions((previous) => [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        amount: value,
        type,
        accountId,
        date: new Date().toISOString(),
      },
      ...previous,
    ]);

    setAccounts((previous) =>
      previous.map((account) =>
        account.id === accountId
          ? {
              ...account,
              balance: account.balance + (type === 'income' ? value : -value),
            }
          : account,
      ),
    );

    setTitle('');
    setAmount('');
    setNotice('Transaction saved.');
    setShowForm(false);
  }

  function recordDebtTransaction(
    title: string,
    amount: number,
    type: 'income' | 'expense',
    selectedAccountId: string,
  ): boolean {
    const selectedAccount = accounts.find(
      (account) => account.id === selectedAccountId,
    );

    if (!selectedAccount) {
      setNotice('Please select a valid account.');
      return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a valid payment amount.');
      return false;
    }

    if (type === 'expense' && selectedAccount.balance < amount) {
      setNotice('Not enough money in this account.');
      return false;
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      title,
      amount,
      type,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
    };

    setTransactions((previous) => [transaction, ...previous]);
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === selectedAccountId
          ? {
              ...account,
              balance: account.balance + (type === 'income' ? amount : -amount),
            }
          : account,
      ),
    );

    setNotice('Payment saved and account balance updated.');
    return true;
  }

  function deleteTransaction(item: Transaction) {
    if (
      !window.confirm(`Delete "${item.title}" and reverse its balance change?`)
    ) {
      return;
    }

    setAccounts((previous) =>
      previous.map((account) =>
        account.id === item.accountId
          ? {
              ...account,
              balance:
                account.balance +
                (item.type === 'expense' ? item.amount : -item.amount),
            }
          : account,
      ),
    );

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== item.id),
    );
    setNotice('Transaction deleted.');
  }

  function addAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newAccount.trim();

    if (!name) return;

    if (
      accounts.some(
        (account) => account.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setNotice('An account with this name already exists.');
      return;
    }

    const id = crypto.randomUUID();
    setAccounts((previous) => [...previous, { id, name, balance: 0 }]);
    setAccountId(id);
    setNewAccount('');
    setNotice('Account created.');
  }

  function removeAccount(id: string) {
    if (transactions.some((item) => item.accountId === id)) {
      setNotice('This account has transactions and cannot be deleted yet.');
      return;
    }

    if (!window.confirm('Delete this account?')) return;

    setAccounts((previous) => previous.filter((account) => account.id !== id));
    setNotice('Account deleted.');
  }

  function openRename(account: Account) {
    setRenameTarget(account);
    setRenameValue(account.name);
  }

  function submitRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renameTarget) return;

    const name = renameValue.trim();
    if (!name) {
      setNotice('Enter a valid account name.');
      return;
    }

    if (
      accounts.some(
        (account) =>
          account.id !== renameTarget.id &&
          account.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setNotice('An account with this name already exists.');
      return;
    }

    setAccounts((previous) =>
      previous.map((account) =>
        account.id === renameTarget.id ? { ...account, name } : account,
      ),
    );
    setRenameTarget(null);
    setRenameValue('');
    setNotice('Account renamed.');
  }

  function openAdjustBalance(account: Account) {
    setBalanceTarget(account);
    setBalanceValue(String(account.balance));
  }

  function submitAdjustBalance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!balanceTarget) return;

    const value = Number(balanceValue);
    if (!Number.isFinite(value) || value < 0) {
      setNotice('Enter a valid non-negative balance.');
      return;
    }

    setAccounts((previous) =>
      previous.map((account) =>
        account.id === balanceTarget.id ? { ...account, balance: value } : account,
      ),
    );
    setBalanceTarget(null);
    setBalanceValue('');
    setNotice('Account balance updated.');
  }

  function exportBackup() {
    const backup: BackupData = {
      app: 'Monevo',
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts,
      transactions,
      profileName,
      currency,
      theme,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `monevo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setNotice('Backup exported.');
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result)) as Partial<BackupData>;

        if (
          raw.app !== 'Monevo' ||
          raw.version !== 1 ||
          !Array.isArray(raw.accounts) ||
          !Array.isArray(raw.transactions)
        ) {
          setNotice(
            'Invalid backup file: missing required top-level fields. Your data was not changed.',
          );
          return;
        }

        if (!raw.accounts.every(isAccount)) {
          setNotice(
            'Invalid backup file: one or more accounts are malformed. Your data was not changed.',
          );
          return;
        }

        if (!raw.transactions.every(isTransaction)) {
          setNotice(
            'Invalid backup file: one or more transactions are malformed. Your data was not changed.',
          );
          return;
        }

        const ids = new Set(raw.accounts.map((account) => account.id));

        if (ids.size !== raw.accounts.length) {
          setNotice(
            'Backup contains duplicate account IDs. Your data was not changed.',
          );
          return;
        }

        if (raw.transactions.some((item) => !ids.has(item.accountId))) {
          setNotice(
            'Backup has transactions pointing at missing accounts. Your data was not changed.',
          );
          return;
        }

        if (
          !window.confirm(
            'Replace current accounts and transactions with this backup?',
          )
        ) {
          return;
        }

        setAccounts(raw.accounts);
        setTransactions(raw.transactions);
        setProfileName(
          typeof raw.profileName === 'string' ? raw.profileName : '',
        );
        setCurrency(isCurrency(raw.currency) ? raw.currency : 'USD');
        setTheme(raw.theme === 'light' ? 'light' : 'dark');
        setAccountId(raw.accounts[0]?.id ?? '');
        setNotice('Backup restored.');
      } catch {
        setNotice('Could not read this backup file. Your data was not changed.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  }

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: LayoutDashboard },
    { id: 'transactions' as const, label: 'Activity', icon: ReceiptText },
    { id: 'debts' as const, label: 'Debts', icon: Wallet },
    { id: 'goals' as const, label: 'Goals', icon: ChartNoAxesCombined },
    { id: 'analysis' as const, label: 'Analysis', icon: ChartNoAxesCombined },
    { id: 'more' as const, label: 'More', icon: Settings },
  ];

  const recentTransactions = transactions.slice(0, 8);

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#0b0d10] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Desktop sidebar */}
        <aside
          className={`hidden w-60 shrink-0 border-r p-6 md:block ${
            isDark ? 'border-white/10' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-lime-400 p-2 text-black">
              <Wallet size={23} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">Monevo</h1>
              <p className="text-xs opacity-60">Personal finance</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  tab === id
                    ? 'bg-lime-400 font-semibold text-black'
                    : isDark
                      ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={19} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          <div
            className={`mt-10 rounded-2xl border p-4 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <p className="text-xs opacity-60">Your money. Your way.</p>
            <p className="mt-2 text-sm">Simple, private, and manual.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 sm:pb-32 md:pb-8">
          <header className="mb-8 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`flex items-center gap-2 text-sm ${mutedText}`}>
                <UserRound size={15} />
                <span className="truncate">
                  {profileName.trim() || 'Personal workspace'}
                </span>
              </p>
              <h2 className="mt-1 truncate text-2xl font-bold">
                {navItems.find((item) => item.id === tab)?.label}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setType('expense');
                setShowForm(true);
              }}
              className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add transaction</span>
              <span className="sm:hidden">Add</span>
            </button>
          </header>

          {notice && (
            <div
              role="status"
              className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                isDark
                  ? 'border-lime-400/20 bg-lime-400/10 text-lime-200'
                  : 'border-lime-600/20 bg-lime-100 text-lime-900'
              }`}
            >
              <span className="min-w-0 break-words">{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg p-1 hover:bg-black/10"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {tab === 'home' && (
            <>
              <section
                className={`rounded-3xl border p-6 sm:p-8 ${
                  isDark
                    ? 'border-white/10 bg-gradient-to-br from-[#1b2420] to-[#121519]'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div className={`flex items-center gap-2 text-sm ${mutedText}`}>
                  <Wallet size={17} />
                  Total Money
                </div>
                <p className="mt-3 break-words text-4xl font-bold tracking-tight sm:text-5xl">
                  {money(total, currency)}
                </p>
                <p className={`mt-3 text-sm ${mutedText}`}>
                  Across {accounts.length}{' '}
                  {accounts.length === 1 ? 'account' : 'accounts'} · Assets
                  excluded
                </p>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    className={`rounded-2xl p-4 ${
                      isDark ? 'bg-black/20' : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm ${mutedText}`}
                    >
                      <ArrowDownLeft size={17} className="text-lime-500" />
                      Income recorded
                    </div>
                    <p className="mt-2 break-words text-lg font-semibold text-lime-500">
                      +{money(totalIncome, currency)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl p-4 ${
                      isDark ? 'bg-black/20' : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm ${mutedText}`}
                    >
                      <ArrowUpRight size={17} className="text-rose-500" />
                      Expenses recorded
                    </div>
                    <p className="mt-2 break-words text-lg font-semibold text-rose-500">
                      -{money(totalExpense, currency)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Your accounts</h3>
                  <button
                    type="button"
                    onClick={() => setTab('more')}
                    className="text-sm text-lime-600 hover:text-lime-500"
                  >
                    Manage accounts
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`min-w-0 rounded-2xl border p-5 ${
                        isDark
                          ? 'border-white/10 bg-[#121519]'
                          : 'border-slate-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className="mb-5 flex items-center justify-between gap-2">
                        <div className="rounded-xl bg-lime-400/10 p-2 text-lime-600">
                          <Wallet size={19} />
                        </div>
                        <span className={`text-xs ${mutedText}`}>{currency}</span>
                      </div>
                      <p className={`truncate text-sm ${mutedText}`}>
                        {account.name}
                      </p>
                      <p className="mt-1 break-words text-xl font-semibold">
                        {money(account.balance, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <TransactionList
                transactions={recentTransactions}
                accounts={accounts}
                onDelete={deleteTransaction}
                onViewAll={() => setTab('transactions')}
                currency={currency}
                theme={theme}
              />
            </>
          )}

          {tab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              accounts={accounts}
              onDelete={deleteTransaction}
              currency={currency}
              theme={theme}
            />
          )}
{tab === 'debts' && (
  <Debts
    accounts={accounts}
    onRecordTransaction={recordDebtTransaction}
    currency={currency}
    theme={theme}
  />
)}

          {tab === 'goals' && (
  <Goals transactions={transactions} currency={currency} theme={theme} />
)}

{tab === 'analysis' && (
  <AnalysisDashboard
    transactions={transactions}
    total={total}
    money={(value) => money(value, currency)}
    currency={currency}
    theme={theme}
  />
)}
          {tab === 'more' && (
            <section>
              <div className="mb-5">
                <h3 className="text-lg font-semibold">Accounts & Settings</h3>
                <p className={`mt-1 text-sm ${mutedText}`}>
                  Manage your money and personalize Monevo.
                </p>
              </div>

              <div
                className={`mb-5 rounded-2xl border p-4 ${
                  isDark
                    ? 'border-lime-400/20 bg-lime-400/5'
                    : 'border-lime-600/20 bg-lime-50'
                }`}
              >
                <p className={`text-sm ${mutedText}`}>Total across accounts</p>
                <p className="mt-2 break-words text-2xl font-semibold text-lime-600">
                  {money(total, currency)}
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  {accounts.length}{' '}
                  {accounts.length === 1 ? 'account' : 'accounts'}
                </p>
              </div>

              <form onSubmit={addAccount} className="mb-6 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newAccount}
                  onChange={(event) => setNewAccount(event.target.value)}
                  placeholder="New account name"
                  aria-label="New account name"
                  className={`min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none focus:border-lime-400 ${
                    isDark
                      ? 'border-white/10 bg-[#121519] text-white'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black"
                >
                  Create
                </button>
              </form>

              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isDark
                        ? 'border-white/10 bg-[#121519]'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className={`mt-1 text-sm ${mutedText}`}>
                        {money(account.balance, currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openRename(account)}
                        className="min-h-[40px] rounded-lg px-3 py-2 text-sm opacity-80 hover:bg-black/5"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => openAdjustBalance(account)}
                        className="min-h-[40px] rounded-lg px-3 py-2 text-sm text-lime-600 hover:bg-lime-400/10"
                      >
                        Balance
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAccount(account.id)}
                        aria-label={`Delete ${account.name}`}
                        className="min-h-[40px] rounded-lg p-2 text-rose-500 hover:bg-rose-400/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`mt-8 space-y-5 rounded-2xl border p-5 ${
                  isDark
                    ? 'border-white/10 bg-[#121519]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <h3 className="text-lg font-semibold">Profile</h3>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    Customize your personal workspace.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="profile-name"
                    className={`mb-2 block text-sm ${mutedText}`}
                  >
                    Your name
                  </label>
                  <input
                    id="profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Enter your name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="currency-select"
                    className={`mb-2 block text-sm ${mutedText}`}
                  >
                    Currency
                  </label>
                  <select
                    id="currency-select"
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value as Currency)
                    }
                    className={`w-full rounded-xl border px-4 py-3 ${
                      isDark
                        ? 'border-white/10 bg-[#1b2026] text-white'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                  </select>
                  <p className={`mt-2 text-xs ${mutedText}`}>
                    Changing the currency changes the display format, not the
                    actual exchange value of your money.
                  </p>
                </div>

                <div>
                  <p className={`mb-2 text-sm ${mutedText}`}>Appearance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-3 ${
                        isDark
                          ? 'border-lime-400 bg-lime-400/10 text-lime-500'
                          : 'border-slate-200'
                      }`}
                    >
                      <Moon size={17} />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-3 ${
                        !isDark
                          ? 'border-lime-400 bg-lime-400/10 text-lime-600'
                          : 'border-white/10'
                      }`}
                    >
                      <Sun size={17} />
                      Light
                    </button>
                  </div>
                </div>

                <div
                  className={`border-t pt-5 ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <h3 className="font-semibold">Backup & Restore</h3>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    Export or restore accounts, transactions, and these
                    settings. Debts and goals are stored separately and are
                    not included in this backup.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportBackup}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black"
                    >
                      <Download size={17} />
                      Export backup
                    </button>
                    <button
                      type="button"
                      onClick={() => backupInputRef.current?.click()}
                      className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-3 ${
                        isDark
                          ? 'border-white/10 hover:bg-white/5'
                          : 'border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Upload size={17} />
                      Restore backup
                    </button>
                    <input
                      ref={backupInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={importBackup}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Mobile navigation"
        className={`fixed inset-x-0 bottom-0 z-30 border-t px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden ${
          isDark ? 'border-white/10 bg-[#0b0d10]/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const shortLabels: Record<Tab, string> = {
              home: 'Home',
              transactions: 'Activity',
              debts: 'Debts',
              goals: 'Goals',
              analysis: 'Stats',
              more: 'More',
            };
            const active = tab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className={`flex min-w-0 min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 transition ${
                  active
                    ? 'text-lime-500'
                    : isDark
                      ? 'text-slate-400 hover:bg-white/5'
                      : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                  {shortLabels[id]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Transaction modal */}
      {showForm && (
        <Modal
          title="New transaction"
          onClose={() => setShowForm(false)}
          isDark={isDark}
        >
          <form onSubmit={addTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`min-h-[44px] rounded-xl py-3 text-sm font-medium ${
                  type === 'expense'
                    ? 'bg-rose-400/15 text-rose-500 ring-1 ring-rose-400/30'
                    : isDark
                      ? 'bg-white/5 opacity-70'
                      : 'bg-slate-100 opacity-70'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`min-h-[44px] rounded-xl py-3 text-sm font-medium ${
                  type === 'income'
                    ? 'bg-lime-400/15 text-lime-600 ring-1 ring-lime-400/30'
                    : isDark
                      ? 'bg-white/5 opacity-70'
                      : 'bg-slate-100 opacity-70'
                }`}
              >
                Income
              </button>
            </div>

            <div>
              <label htmlFor="tx-title" className={`mb-2 block text-sm ${mutedText}`}>
                What was it for?
              </label>
              <input
                id="tx-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Groceries"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tx-amount" className={`mb-2 block text-sm ${mutedText}`}>
                Amount ({currency})
              </label>
              <input
                id="tx-amount"
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="tx-account" className={`mb-2 block text-sm ${mutedText}`}>
                Account
              </label>
              <select
                id="tx-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 ${
                  isDark
                    ? 'border-white/10 bg-[#1b2026] text-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {money(account.balance, currency)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black transition hover:bg-lime-300"
            >
              Save transaction
            </button>
          </form>
        </Modal>
      )}

      {/* Rename account modal */}
      {renameTarget && (
        <Modal
          title="Rename account"
          onClose={() => {
            setRenameTarget(null);
            setRenameValue('');
          }}
          isDark={isDark}
        >
          <form onSubmit={submitRename} className="space-y-4">
            <div>
              <label htmlFor="rename-input" className={`mb-2 block text-sm ${mutedText}`}>
                New name
              </label>
              <input
                id="rename-input"
                autoFocus
                required
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black"
            >
              Save name
            </button>
          </form>
        </Modal>
      )}

      {/* Adjust balance modal */}
      {balanceTarget && (
        <Modal
          title="Adjust balance"
          onClose={() => {
            setBalanceTarget(null);
            setBalanceValue('');
          }}
          isDark={isDark}
        >
          <form onSubmit={submitAdjustBalance} className="space-y-4">
            <p className={`text-sm ${mutedText}`}>
              Current balance: {money(balanceTarget.balance, currency)}
            </p>
            <div>
              <label htmlFor="balance-input" className={`mb-2 block text-sm ${mutedText}`}>
                New balance ({currency})
              </label>
              <input
                id="balance-input"
                autoFocus
                required
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={balanceValue}
                onChange={(event) => setBalanceValue(event.target.value)}
                className={inputClass}
              />
            </div>
            <p className={`text-xs ${mutedText}`}>
              This is a direct edit of the stored balance. It does not create
              a transaction.
            </p>
            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black"
            >
              Save balance
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

function Modal({
  title,
  onClose,
  isDark,
  children,
}: {
  title: string;
  onClose: () => void;
  isDark: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl ${
          isDark
            ? 'border-white/10 bg-[#121519] text-slate-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="truncate text-xl font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-2 opacity-70 hover:bg-black/10"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Transaction list                                                   */
/* ------------------------------------------------------------------ */

function TransactionList({
  transactions,
  accounts,
  onDelete,
  onViewAll,
  currency,
  theme,
}: {
  transactions: Transaction[];
  accounts: Account[];
  onDelete: (item: Transaction) => void;
  onViewAll?: () => void;
  currency: Currency;
  theme: Theme;
}) {
  const isDark = theme === 'dark';
  const mutedText = isDark ? 'opacity-60' : 'text-slate-500';

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {onViewAll ? 'Recent activity' : 'Transactions'}
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm text-lime-600 hover:text-lime-500"
          >
            View all
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden rounded-2xl border ${
          isDark ? 'border-white/10 bg-[#121519]' : 'border-slate-200 bg-white'
        }`}
      >
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptText className="mx-auto mb-3 text-slate-500" size={30} />
            <p className="font-medium">No transactions yet</p>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Add your first income or expense to get started.
            </p>
          </div>
        ) : (
          transactions.map((item) => {
            const account = accounts.find((a) => a.id === item.accountId);
            const isIncome = item.type === 'income';

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 border-b p-4 last:border-0 ${
                  isDark ? 'border-white/5' : 'border-slate-100'
                }`}
              >
                <div
                  className={`shrink-0 rounded-xl p-2 ${
                    isIncome
                      ? 'bg-lime-400/10 text-lime-600'
                      : 'bg-rose-400/10 text-rose-500'
                  }`}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className={`mt-1 truncate text-xs ${mutedText}`}>
                    {account?.name ?? 'Unknown account'} ·{' '}
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
                    isIncome ? 'text-lime-600' : ''
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {money(item.amount, currency)}
                </p>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  aria-label={`Delete ${item.title}`}
                  className="shrink-0 rounded-lg p-2 opacity-60 hover:bg-rose-400/10 hover:text-rose-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default App;