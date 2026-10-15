import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Target, Trash2, Wallet, PiggyBank, X } from 'lucide-react';

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  createdAt: string;
};

type GoalTransaction = {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  date: string;
};

type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
type Theme = 'dark' | 'light';

type GoalsProps = {
  transactions: GoalTransaction[];
  currency: Currency;
  theme: Theme;
};

const GOALS_KEY = 'monevo_goals_v1';
const BUDGET_KEY = 'monevo_monthly_budget_v1';

function readSaved<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readBudget(): number {
  const raw = readSaved<unknown>(BUDGET_KEY, 500);
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return 500;
  }
  return raw;
}

function isGoal(value: unknown): value is Goal {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    typeof item.target === 'number' &&
    Number.isFinite(item.target) &&
    item.target > 0 &&
    typeof item.saved === 'number' &&
    Number.isFinite(item.saved) &&
    item.saved >= 0 &&
    typeof item.createdAt === 'string'
  );
}

function readGoals(): Goal[] {
  try {
    const saved = localStorage.getItem(GOALS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGoal);
  } catch {
    return [];
  }
}

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function isCurrentMonth(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth()
  );
}

export default function Goals({ transactions, currency, theme }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>(readGoals);
  const [budget, setBudget] = useState<number>(readBudget);
  const [budgetInput, setBudgetInput] = useState<string>(() =>
    String(readBudget()),
  );
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [notice, setNotice] = useState('');
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);

  const submittingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  }, [budget]);

  // If the stored budget changes externally (e.g. restore), sync the input
  // only when the user is not mid-edit.
  useEffect(() => {
    setBudgetInput((current) => {
      const parsed = Number(current);
      if (
        Number.isFinite(parsed) &&
        parsed > 0 &&
        Math.abs(parsed - budget) < 0.005
      ) {
        return current;
      }
      return String(budget);
    });
  }, [budget]);

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

  const monthlyExpenses = useMemo(
    () =>
      transactions
        .filter(
          (item) => item.type === 'expense' && isCurrentMonth(item.date),
        )
        .reduce((sum, item) => sum + item.amount, 0),
    [transactions],
  );

  const budgetUsed = budget > 0 ? (monthlyExpenses / budget) * 100 : 0;
  const budgetRemaining = budget - monthlyExpenses;

  function saveBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(budgetInput);

    if (!Number.isFinite(value) || value <= 0) {
      setNotice('Enter a valid monthly budget greater than zero.');
      return;
    }

    setBudget(value);
    setNotice('Monthly budget updated.');
  }

  function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => {
      submittingRef.current = false;
    }, 500);

    const cleanName = name.trim();
    const targetAmount = Number(target);

    if (
      !cleanName ||
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      setNotice('Enter a goal name and a valid target amount.');
      return;
    }

    setGoals((previous) => [
      {
        id: crypto.randomUUID(),
        name: cleanName,
        target: targetAmount,
        saved: 0,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ]);

    setName('');
    setTarget('');
    setShowForm(false);
    setNotice('Goal created.');
  }

  function submitProgress(goal: Goal, amount: number) {
    const remaining = Math.max(0, goal.target - goal.saved);

    if (remaining <= 0) {
      setNotice('This goal is already complete.');
      return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a valid amount greater than zero.');
      return false;
    }

    setGoals((previous) =>
      previous.map((item) =>
        item.id === goal.id
          ? { ...item, saved: Math.min(item.target, item.saved + amount) }
          : item,
      ),
    );

    setNotice('Goal progress updated.');
    return true;
  }

  function deleteGoal(goal: Goal) {
    if (!window.confirm(`Delete "${goal.name}"?`)) return;
    setGoals((previous) => previous.filter((item) => item.id !== goal.id));
    setNotice('Goal deleted.');
  }

  return (
    <div className="space-y-8">
      <section
        className={`rounded-3xl border p-6 sm:p-8 ${
          isDark
            ? 'border-white/10 bg-gradient-to-br from-[#1b2420] to-[#121519]'
            : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div className={`flex items-center gap-2 text-sm ${mutedText}`}>
          <Wallet size={18} />
          Monthly budget
        </div>

        <p className="mt-3 break-words text-3xl font-bold">
          {formatMoney(budget, currency)}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <span className={mutedText}>Spent this month</span>
          <span className="shrink-0 font-semibold">
            {formatMoney(monthlyExpenses, currency)}
          </span>
        </div>

        <div
          className={`mt-3 h-3 overflow-hidden rounded-full ${
            isDark ? 'bg-white/10' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              budgetUsed > 100
                ? 'bg-rose-400'
                : budgetUsed >= 80
                  ? 'bg-amber-300'
                  : 'bg-lime-400'
            }`}
            style={{ width: `${Math.min(100, budgetUsed)}%` }}
          />
        </div>

        <div
          className={`mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs ${mutedText}`}
        >
          <span>{Math.round(budgetUsed)}% used</span>
          <span>
            {budgetRemaining >= 0
              ? `${formatMoney(budgetRemaining, currency)} left`
              : `${formatMoney(Math.abs(budgetRemaining), currency)} over budget`}
          </span>
        </div>

        <form onSubmit={saveBudget} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
            aria-label="Monthly budget amount"
            className={`min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none focus:border-lime-400 ${
              isDark
                ? 'border-white/10 bg-black/20 text-white'
                : 'border-slate-200 bg-white text-slate-900'
            }`}
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-black"
          >
            Update budget
          </button>
        </form>

        <p className={`mt-3 text-xs ${mutedText}`}>
          Calculated from expenses recorded in Monevo during the current
          calendar month.
        </p>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Savings goals</h3>
            <p className={`mt-1 text-sm ${mutedText}`}>
              {goals.length} goal(s) · Track your progress
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-semibold text-black"
          >
            <Plus size={18} />
            Add goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className={`${cardClass} p-8 text-center`}>
            <Target className="mx-auto mb-3 text-slate-500" size={32} />
            <p className="font-medium">No goals yet</p>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Create a goal to start tracking your progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {goals.map((goal) => {
              const remaining = Math.max(0, goal.target - goal.saved);
              const progress = Math.min(100, (goal.saved / goal.target) * 100);
              const complete = remaining === 0;

              return (
                <article key={goal.id} className={`${cardClass} min-w-0 p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`shrink-0 rounded-xl p-3 ${
                          isDark
                            ? 'bg-lime-400/10 text-lime-300'
                            : 'bg-lime-400/15 text-lime-600'
                        }`}
                      >
                        <PiggyBank size={22} />
                      </div>
                      <h4 className="min-w-0 break-words font-semibold">
                        {goal.name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteGoal(goal)}
                      aria-label={`Delete ${goal.name}`}
                      className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs ${mutedText}`}>Progress</p>
                      <p className="mt-1 break-words text-lg font-semibold">
                        {formatMoney(goal.saved, currency)}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm ${mutedText}`}>
                      of {formatMoney(goal.target, currency)}
                    </p>
                  </div>

                  <div
                    className={`mt-3 h-2 overflow-hidden rounded-full ${
                      isDark ? 'bg-white/10' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-lime-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div
                    className={`mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs ${mutedText}`}
                  >
                    <span>{Math.round(progress)}% complete</span>
                    <span>
                      {complete
                        ? 'Goal reached!'
                        : `${formatMoney(remaining, currency)} to go`}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={complete}
                    onClick={() => setProgressGoal(goal)}
                    className={`mt-4 min-h-[44px] w-full rounded-xl border py-3 text-sm font-medium transition disabled:opacity-40 ${
                      isDark
                        ? 'border-white/10 hover:bg-white/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {complete ? 'Completed' : 'Update progress'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <Modal
          title="Create a goal"
          onClose={() => setShowForm(false)}
          isDark={isDark}
        >
          <form onSubmit={addGoal} className="space-y-4">
            <div>
              <label htmlFor="goal-name" className={`mb-2 block text-sm ${mutedText}`}>
                Goal name
              </label>
              <input
                id="goal-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. New laptop"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="goal-target" className={`mb-2 block text-sm ${mutedText}`}>
                Target amount ({currency})
              </label>
              <input
                id="goal-target"
                required
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="1000"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black"
            >
              Create goal
            </button>
          </form>
        </Modal>
      )}

      {progressGoal && (
        <ProgressModal
          goal={progressGoal}
          currency={currency}
          isDark={isDark}
          onClose={() => setProgressGoal(null)}
          onSubmit={(amount) => {
            const ok = submitProgress(progressGoal, amount);
            if (ok) setProgressGoal(null);
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
/* Progress modal                                                     */
/* ------------------------------------------------------------------ */

function ProgressModal({
  goal,
  currency,
  isDark,
  onClose,
  onSubmit,
}: {
  goal: Goal;
  currency: Currency;
  isDark: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const [amountInput, setAmountInput] = useState(String(remaining));
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
      setError('Enter a valid amount greater than zero.');
      return;
    }

    onSubmit(value);
  }

  return (
    <Modal title="Update goal progress" onClose={onClose} isDark={isDark}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`rounded-xl border p-3 text-sm ${
            isDark
              ? 'border-white/10 bg-black/20'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className="font-medium">{goal.name}</p>
          <p className={`mt-1 ${mutedText}`}>
            {formatMoney(goal.saved, currency)} saved of{' '}
            {formatMoney(goal.target, currency)}
          </p>
          <p className={`mt-1 ${mutedText}`}>
            Remaining: {formatMoney(remaining, currency)}
          </p>
        </div>

        <div>
          <label htmlFor="progress-amount" className={`mb-2 block text-sm ${mutedText}`}>
            Amount to add ({currency})
          </label>
          <input
            id="progress-amount"
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
          className="min-h-[48px] w-full rounded-xl bg-lime-400 py-3 font-semibold text-black"
        >
          Add progress
        </button>
      </form>
    </Modal>
  );
}