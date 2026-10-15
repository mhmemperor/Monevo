import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

type DebtKind = 'owe' | 'owed' | 'loan';

type DebtRecord = {
  id: string;
  kind: DebtKind;
  title: string;
  person: string;
  amount: number;
  paid: number;
  dueDate: string;
  monthlyPayment: number;
  reminderDays: number;
  createdAt: string;
};

type DebtAccount = {
  id: string;
  name: string;
  balance: number;
};

type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
type Theme = 'dark' | 'light';

type DebtsProps = {
  accounts: DebtAccount[];
  onRecordTransaction: (
    title: string,
    amount: number,
    type: 'income' | 'expense',
    accountId: string,
  ) => boolean;
  currency: Currency;
  theme: Theme;
};

const STORAGE_KEY = 'monevo_debts_v1';

const emptyForm = {
  kind: 'owe' as DebtKind,
  title: '',
  person: '',
  amount: '',
  dueDate: '',
  monthlyPayment: '',
  reminderDays: '3',
};

const kinds: { id: DebtKind; label: string }[] = [
  { id: 'owe', label: 'I Owe' },
  { id: 'owed', label: 'Owed to Me' },
  { id: 'loan', label: 'Loans' },
];

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function isDebtRecord(value: unknown): value is DebtRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    (item.kind === 'owe' || item.kind === 'owed' || item.kind === 'loan') &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    typeof item.person === 'string' &&
    typeof item.amount === 'number' &&
    Number.isFinite(item.amount) &&
    item.amount >= 0 &&
    typeof item.paid === 'number' &&
    Number.isFinite(item.paid) &&
    item.paid >= 0 &&
    typeof item.dueDate === 'string' &&
    typeof item.monthlyPayment === 'number' &&
    Number.isFinite(item.monthlyPayment) &&
    item.monthlyPayment >= 0 &&
    typeof item.reminderDays === 'number' &&
    Number.isFinite(item.reminderDays) &&
    item.reminderDays >= 0 &&
    typeof item.createdAt === 'string'
  );
}

function loadDebts(): DebtRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDebtRecord);
  } catch {
    return [];
  }
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${date}T00:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export default function Debts({
  accounts,
  onRecordTransaction,
  currency,
  theme,
}: DebtsProps) {
  const [records, setRecords] = useState<DebtRecord[]>(loadDebts);
  const [activeKind, setActiveKind] = useState<DebtKind>('owe');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [payingRecord, setPayingRecord] = useState<DebtRecord | null>(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const isDark = theme === 'dark';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardClass = `rounded-2xl border ${
    isDark ? 'border-white/10 bg-[#121519]' : 'border-slate-200 bg-white'
  }`;
  const inputClass = `w-full rounded-xl border px-4 py-3 outline-none focus:border-lime-400 ${
    isDark
      ? 'border-white/10 bg-black/20 text-white'
      : 'border-slate-200 bg-white text-slate-900'
  }`;

  const visibleRecords = useMemo(
    () => records.filter((record) => record.kind === activeKind),
    [records, activeKind],
  );

  const totals = useMemo(() => {
    return kinds.reduce((result, kind) => {
      const items = records.filter((record) => record.kind === kind.id);
      result[kind.id] = items.reduce(
        (sum, record) => sum + Math.max(0, record.amount - record.paid),
        0,
      );
      return result;
    }, {} as Record<DebtKind, number>);
  }, [records]);

  const upcoming = useMemo(() => {
    return records.filter((record) => {
      if (!record.dueDate || record.paid >= record.amount) return false;
      const days = daysUntil(record.dueDate);
      return days >= 0 && days <= record.reminderDays;
    });
  }, [records]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function addRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => {
      submittingRef.current = false;
    }, 500);

    const amount = Number(form.amount);
    const monthlyPayment = Number(form.monthlyPayment || 0);
    const reminderDays = Number(form.reminderDays);

    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a description and a valid amount.');
      return;
    }

    if (
      !Number.isFinite(monthlyPayment) ||
      monthlyPayment < 0 ||
      !Number.isFinite(reminderDays) ||
      reminderDays < 0
    ) {
      setNotice('Check the installment and reminder values.');
      return;
    }

    if (form.dueDate && Number.isNaN(Date.parse(`${form.dueDate}T00:00:00`))) {
      setNotice('Enter a valid due date.');
      return;
    }

    const record: DebtRecord = {
      id: crypto.randomUUID(),
      kind: form.kind,
      title: form.title.trim(),
      person: form.person.trim(),
      amount,
      paid: 0,
      dueDate: form.dueDate,
      monthlyPayment,
      reminderDays,
      createdAt: new Date().toISOString(),
    };

    setRecords((previous) => [record, ...previous]);
    setActiveKind(record.kind);
    setForm(emptyForm);
    setShowForm(false);
    setNotice('Record saved.');
  }

  function submitPayment(record: DebtRecord, paymentAmount: number, accountId: string) {
    const remaining = Math.max(0, record.amount - record.paid);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setNotice('Enter a valid payment amount.');
      return false;
    }

    if (paymentAmount > remaining) {
      setNotice('Payment cannot exceed the remaining amount.');
      return false;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);
    if (!selectedAccount) {
      setNotice('Please select a valid account.');
      return false;
    }

    const transactionType: 'income' | 'expense' =
      record.kind === 'owed' ? 'income' : 'expense';

    const success = onRecordTransaction(
      record.kind === 'owed'
        ? `Money received: ${record.title}`
        : `Debt payment: ${record.title}`,
      paymentAmount,
      transactionType,
      selectedAccount.id,
    );

    if (!success) return false;

    setRecords((previous) =>
      previous.map((item) =>
        item.id === record.id
          ? { ...item, paid: item.paid + paymentAmount }
          : item,
      ),
    );

    setNotice(
      `Payment of ${formatMoney(paymentAmount, currency)} recorded.`,
    );
    return true;
  }

  function deleteRecord(record: DebtRecord) {
    if (!window.confirm(`Delete "${record.title}"?`)) return;
    setRecords((previous) =>
      previous.filter((item) => item.id !== record.id),
    );
    setNotice('Record deleted.');
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kinds.map((kind) => {
          const active = activeKind === kind.id;
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => setActiveKind(kind.id)}
              aria-pressed={active}
              className={`min-h-[44px] rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-lime-400/50 bg-lime-400/10'
                  : isDark
                    ? 'border-white/10 bg-[#121519] hover:bg-white/5'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className={`text-sm ${mutedText}`}>{kind.label}</p>
              <p className="mt-2 break-words text-xl font-semibold">
                {formatMoney(totals[kind.id] ?? 0, currency)}
              </p>
              <p className={`mt-2 text-xs ${mutedText}`}>Remaining balance</p>
            </button>
          );
        })}
      </section>

      {upcoming.length > 0 && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-200">
            <CalendarDays size={19} />
            <h3 className="font-semibold">Upcoming due dates</h3>
          </div>
          <div className="space-y-3">
            {upcoming.map((record) => {
              const days = daysUntil(record.dueDate);
              return (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 break-words">
                    {record.title} ·{' '}
                    {formatMoney(record.amount - record.paid, currency)}
                  </span>
                  <span className="shrink-0 font-medium text-amber-700 dark:text-amber-200">
                    {days === 0 ? 'Due today' : `Due in ${days} day(s)`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-amber-700/80 dark:text-amber-100/70">
            These reminders appear inside Monevo when you open the app. They
            are not system notifications.
          </p>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">
              {kinds.find((kind) => kind.id === activeKind)?.label}
            </h3>
            <p className={`mt-1 text-sm ${mutedText}`}>
              {visibleRecords.length} record(s)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, kind: activeKind });
              setShowForm(true);
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-black"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        {visibleRecords.length === 0 ? (
          <div className={`${cardClass} p-8 text-center`}>
            <Wallet className="mx-auto mb-3 text-slate-500" size={30} />
            <p className="font-medium">Nothing here yet</p>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Add a record to start tracking this section.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecords.map((record) => {
              const remaining = Math.max(0, record.amount - record.paid);
              const complete = remaining === 0;
              const progress =
                record.amount > 0
                  ? Math.min(100, (record.paid / record.amount) * 100)
                  : 0;

              return (
                <article key={record.id} className={`${cardClass} p-4 sm:p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`shrink-0 rounded-xl p-2 ${
                          isDark
                            ? 'bg-white/5 text-lime-300'
                            : 'bg-lime-400/10 text-lime-600'
                        }`}
                      >
                        {activeKind === 'owed' ? (
                          <ArrowDownLeft size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="break-words font-semibold">
                          {record.title}
                        </h4>
                        <p className={`mt-1 break-words text-sm ${mutedText}`}>
                          {record.person || 'No person specified'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteRecord(record)}
                      aria-label={`Delete ${record.title}`}
                      className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <p className={`text-xs ${mutedText}`}>Original amount</p>
                      <p className="mt-1 break-words font-medium">
                        {formatMoney(record.amount, currency)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs ${mutedText}`}>Remaining</p>
                      <p
                        className={`mt-1 break-words font-semibold ${
                          complete ? 'text-lime-600 dark:text-lime-300' : ''
                        }`}
                      >
                        {formatMoney(remaining, currency)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mt-4 h-2 overflow-hidden rounded-full ${
                      isDark ? 'bg-white/10' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-lime-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-xs ${mutedText}`}>
                    {Math.round(progress)}% paid
                    {record.dueDate ? ` · Due ${record.dueDate}` : ''}
                  </p>

                  {record.monthlyPayment > 0 && (
                    <p className={`mt-2 text-xs ${mutedText}`}>
                      Planned monthly payment:{' '}
                      {formatMoney(record.monthlyPayment, currency)}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={complete}
                    onClick={() => setPayingRecord(record)}
                    className={`mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isDark
                        ? 'border-white/10 hover:bg-white/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 size={17} />
                    {complete ? 'Completed' : 'Record payment'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <Modal
          title="New financial record"
          onClose={() => setShowForm(false)}
          isDark={isDark}
        >
          <form onSubmit={addRecord} className="space-y-4">
            <div>
              <label htmlFor="debt-kind" className={`mb-2 block text-sm ${mutedText}`}>
                Type
              </label>
              <select
                id="debt-kind"
                value={form.kind}
                onChange={(event) => updateForm('kind', event.target.value)}
                className={`w-full rounded-xl border px-4 py-3 ${
                  isDark
                    ? 'border-white/10 bg-[#1b2026] text-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {kinds.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="debt-title" className={`mb-2 block text-sm ${mutedText}`}>
                Description *
              </label>
              <input
                id="debt-title"
                required
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="e.g. Personal loan"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="debt-person" className={`mb-2 block text-sm ${mutedText}`}>
                Person or organization
              </label>
              <input
                id="debt-person"
                value={form.person}
                onChange={(event) => updateForm('person', event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="debt-amount" className={`mb-2 block text-sm ${mutedText}`}>
                Total amount ({currency}) *
              </label>
              <input
                id="debt-amount"
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateForm('amount', event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="debt-due" className={`mb-2 block text-sm ${mutedText}`}>
                Due date
              </label>
              <input
                id="debt-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm('dueDate', event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="debt-monthly" className={`mb-2 block text-sm ${mutedText}`}>
                Planned monthly payment ({currency})
              </label>
              <input
                id="debt-monthly"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.monthlyPayment}
                onChange={(event) => updateForm('monthlyPayment', event.target.value)}
                placeholder="0 if not applicable"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="debt-reminder" className={`mb-2 block text-sm ${mutedText}`}>
                Reminder before due date (days)
              </label>
              <input
                id="debt-reminder"
                required
                type="number"
                inputMode="numeric"
                min="0"
                max="365"
                value={form.reminderDays}
                onChange={(event) => updateForm('reminderDays', event.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black hover:bg-lime-300"
            >
              Save record
            </button>
          </form>
        </Modal>
      )}

      {payingRecord && (
        <PaymentModal
          record={payingRecord}
          accounts={accounts}
          currency={currency}
          isDark={isDark}
          onClose={() => setPayingRecord(null)}
          onSubmit={(paymentAmount, accountId) => {
            const ok = submitPayment(payingRecord, paymentAmount, accountId);
            if (ok) setPayingRecord(null);
          }}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-[70] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#242a30] px-4 py-3 text-sm text-white shadow-xl"
        >
          <span className="min-w-0 break-words">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-1 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
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
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl ${
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
/* Payment modal                                                      */
/* ------------------------------------------------------------------ */

function PaymentModal({
  record,
  accounts,
  currency,
  isDark,
  onClose,
  onSubmit,
}: {
  record: DebtRecord;
  accounts: DebtAccount[];
  currency: Currency;
  isDark: boolean;
  onClose: () => void;
  onSubmit: (paymentAmount: number, accountId: string) => void;
}) {
  const remaining = Math.max(0, record.amount - record.paid);
  const suggested =
    record.monthlyPayment > 0
      ? Math.min(record.monthlyPayment, remaining)
      : remaining;

  const [amountInput, setAmountInput] = useState(String(suggested));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [error, setError] = useState('');

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = `w-full rounded-xl border px-4 py-3 outline-none focus:border-lime-400 ${
    isDark
      ? 'border-white/10 bg-black/20 text-white'
      : 'border-slate-200 bg-white text-slate-900'
  }`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amountInput);

    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (value > remaining) {
      setError(
        `Payment cannot exceed the remaining ${formatMoney(remaining, currency)}.`,
      );
      return;
    }
    if (!accounts.some((a) => a.id === accountId)) {
      setError('Please select a valid account.');
      return;
    }

    onSubmit(value, accountId);
  }

  return (
    <Modal
      title={record.kind === 'owed' ? 'Record money received' : 'Record payment'}
      onClose={onClose}
      isDark={isDark}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`rounded-xl border p-3 text-sm ${
            isDark
              ? 'border-white/10 bg-black/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className="font-medium">{record.title}</p>
          <p className={`mt-1 ${mutedText}`}>
            Remaining: {formatMoney(remaining, currency)}
          </p>
        </div>

        {accounts.length === 0 ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-500">
            You have no accounts. Add an account first, then come back to
            record this payment.
          </p>
        ) : (
          <>
            <div>
              <label htmlFor="pay-amount" className={`mb-2 block text-sm ${mutedText}`}>
                Payment amount ({currency})
              </label>
              <input
                id="pay-amount"
                autoFocus
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(event.target.value);
                  setError('');
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="pay-account" className={`mb-2 block text-sm ${mutedText}`}>
                Pay from / receive into
              </label>
              <select
                id="pay-account"
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  setError('');
                }}
                className={`w-full rounded-xl border px-4 py-3 ${
                  isDark
                    ? 'border-white/10 bg-[#1b2026] text-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {formatMoney(account.balance, currency)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-500"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black hover:bg-lime-300"
            >
              Save payment
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}