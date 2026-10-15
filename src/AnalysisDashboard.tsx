import { useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

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

type Props = {
  transactions: Transaction[];
  total: number;
  money: (amount: number) => string;
  currency: Currency;
  theme: Theme;
};

export default function AnalysisDashboard({
  transactions,
  total,
  money,
  theme,
}: Props) {
  const [period, setPeriod] = useState<'6' | '12'>('6');
  const gradientId = useId().replace(/:/g, '');
  const isDark = theme === 'dark';

  const data = useMemo(() => {
    const now = new Date();
    const months: {
      key: string;
      month: string;
      income: number;
      expenses: number;
      net: number;
    }[] = [];

    for (let i = Number(period) - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;

      months.push({
        key,
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        expenses: 0,
        net: 0,
      });
    }

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) continue;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;

      const month = months.find((item) => item.key === key);
      if (!month) continue;

      if (transaction.type === 'income') {
        month.income += transaction.amount;
      } else {
        month.expenses += transaction.amount;
      }
    }

    for (const month of months) {
      month.net = month.income - month.expenses;
    }

    return months;
  }, [transactions, period]);

  const income = data.reduce((sum, month) => sum + month.income, 0);
  const expenses = data.reduce((sum, month) => sum + month.expenses, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : null;

  const hasAnyActivity = useMemo(
    () => data.some((m) => m.income > 0 || m.expenses > 0),
    [data],
  );

  const stats = [
    {
      label: 'Current total',
      value: money(total),
      icon: Wallet,
      color: isDark ? 'text-lime-400' : 'text-lime-600',
    },
    {
      label: 'Income',
      value: money(income),
      icon: TrendingUp,
      color: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    {
      label: 'Expenses',
      value: money(expenses),
      icon: TrendingDown,
      color: isDark ? 'text-rose-400' : 'text-rose-500',
    },
    {
      label: 'Savings rate',
      value:
        savingsRate === null
          ? '—'
          : `${savingsRate.toFixed(1)}%`,
      icon: PiggyBank,
      color:
        savingsRate === null
          ? isDark
            ? 'text-slate-400'
            : 'text-slate-500'
          : savingsRate >= 0
            ? isDark
              ? 'text-lime-400'
              : 'text-lime-600'
            : isDark
              ? 'text-rose-400'
              : 'text-rose-500',
    },
  ];

  const chartGrid = isDark ? '#343a35' : '#e2e8f0';
  const chartAxis = isDark ? '#94a3b8' : '#64748b';
  const chartTooltipStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#171a18' : '#ffffff',
    border: `1px solid ${isDark ? '#343a35' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: isDark ? '#ffffff' : '#0f172a',
    fontSize: 12,
  };
  const barIncomeColor = isDark ? '#a3e635' : '#65a30d';
  const barExpenseColor = isDark ? '#fb7185' : '#e11d48';
  const netStrokeColor = isDark ? '#a3e635' : '#65a30d';

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardClass = `min-w-0 rounded-2xl border p-4 ${
    isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
  }`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Financial Analysis</h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Understand your money over time.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Analysis period"
          className={`flex rounded-xl border p-1 ${
            isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100'
          }`}
        >
          {(['6', '12'] as const).map((value) => {
            const active = period === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(value)}
                className={`min-h-[44px] rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-lime-400 font-semibold text-black'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {value} months
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <span className={`min-w-0 truncate text-sm ${mutedText}`}>
                  {stat.label}
                </span>
                <Icon size={19} className={`shrink-0 ${stat.color}`} />
              </div>
              <p className="mt-3 break-words text-xl font-semibold tabular-nums sm:text-2xl">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={cardClass}>
          <h3 className="mb-4 font-semibold">Income vs expenses</h3>

          <div className="h-64 w-full min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke={chartAxis}
                  fontSize={12}
                  tickMargin={6}
                />
                <YAxis
                  stroke={chartAxis}
                  fontSize={11}
                  tickFormatter={(value) => Number(value).toLocaleString()}
                  width={56}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => money(Number(value ?? 0))}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill={barIncomeColor}
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill={barExpenseColor}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-4 font-semibold">Net cash flow</h3>

          <div className="h-64 w-full min-w-0 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient
                    id={`netGradient-${gradientId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={netStrokeColor}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={netStrokeColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={chartGrid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke={chartAxis}
                  fontSize={12}
                  tickMargin={6}
                />
                <YAxis
                  stroke={chartAxis}
                  fontSize={11}
                  tickFormatter={(value) => Number(value).toLocaleString()}
                  width={56}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => money(Number(value ?? 0))}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Net activity"
                  stroke={netStrokeColor}
                  strokeWidth={2}
                  fill={`url(#netGradient-${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Monthly breakdown</h3>
          {!hasAnyActivity && (
            <span className={`text-xs ${mutedText}`}>
              No transactions recorded in this period yet.
            </span>
          )}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className={mutedText}>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10' : 'border-slate-200'
                }`}
              >
                <th className="py-3 pr-4 font-medium">Month</th>
                <th className="py-3 pr-4 font-medium">Income</th>
                <th className="py-3 pr-4 font-medium">Expenses</th>
                <th className="py-3 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((month) => (
                <tr
                  key={month.key}
                  className={`border-b last:border-0 ${
                    isDark ? 'border-white/5' : 'border-slate-100'
                  }`}
                >
                  <td className="py-3 pr-4">{month.month}</td>
                  <td
                    className={`py-3 pr-4 tabular-nums ${
                      isDark ? 'text-lime-400' : 'text-lime-600'
                    }`}
                  >
                    {money(month.income)}
                  </td>
                  <td
                    className={`py-3 pr-4 tabular-nums ${
                      isDark ? 'text-rose-400' : 'text-rose-500'
                    }`}
                  >
                    {money(month.expenses)}
                  </td>
                  <td
                    className={`py-3 tabular-nums ${
                      month.net >= 0
                        ? isDark
                          ? 'text-lime-400'
                          : 'text-lime-600'
                        : isDark
                          ? 'text-rose-400'
                          : 'text-rose-500'
                    }`}
                  >
                    {money(month.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className={`text-xs leading-5 ${mutedText}`}>
        Analysis uses recorded transactions only. Starting account balances are
        not counted as income. This app does not currently model transfers
        between accounts — every recorded income or expense is treated as a
        change to the total across your accounts.
      </p>
    </section>
  );
}