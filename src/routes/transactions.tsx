import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/transactions')({
  component: TransactionsPage,
})

type Named = {
  id: string
  name: string
}

type Account = {
  id: string
  business_id: string
  platform_id: string | null
  name: string
  created_at: string | null
  updated_at: string | null
  default_financial_account_id: string | null
}

type Transaction = {
  id: string
  business_id: string
  amount: number | string
  transaction_date: string
  transaction_type: 'transfer' | 'expense' | string
  account_id: string | null
  description: string | null
  created_at: string | null
  updated_at: string | null
  currency: string | null
  status: string | null
  to_financial_account_id: string | null
}

type TransactionForm = {
  transaction_type: 'transfer' | 'expense'
  transaction_date: string
  amount: string
  account_id: string
  description: string
}

type AccountForm = {
  name: string
  business_id: string
  platform_id: string
  default_financial_account_id: string
}

const today = () => {
  const n = new Date()
  return new Date(
    n.getTime() - n.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10)
}

const dateOnly = (v?: string | null) => v?.slice(0, 10) ?? ''

const dateText = (v?: string | null) => {
  const [y, m, d] = dateOnly(v).split('-')
  return y && m && d ? `${d}/${m}/${y}` : '—'
}

const money = (v: number) =>
  new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v)

const dbDate = (v: string) => `${v}T00:00:00+03:00`

const blankTx = (
  accountId = '',
  type: 'transfer' | 'expense' = 'transfer',
): TransactionForm => ({
  transaction_type: type,
  transaction_date: today(),
  amount: '',
  account_id: accountId,
  description: '',
})

const blankAccount = (): AccountForm => ({
  name: '',
  business_id: '',
  platform_id: '',
  default_financial_account_id: '',
})

function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [businesses, setBusinesses] = useState<Named[]>([])
  const [platforms, setPlatforms] = useState<Named[]>([])
  const [financialAccounts, setFinancialAccounts] = useState<Named[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [businessFilter, setBusinessFilter] = useState('')
  const [columnCount, setColumnCount] = useState(4)

  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [transactionForm, setTransactionForm] =
    useState<TransactionForm>(blankTx())

  const [accountForm, setAccountForm] =
    useState<AccountForm>(blankAccount())

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)

  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null)

  const [showTransactionModal, setShowTransactionModal] =
    useState(false)

  const [showAccountModal, setShowAccountModal] =
    useState(false)

  const [selectedTransactionId, setSelectedTransactionId] =
    useState<string | null>(null)

  const fetchData = async () => {
    setRefreshing(true)
    setError('')

    try {
      const r = await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id,business_id,amount,transaction_date,transaction_type,account_id,description,created_at,updated_at,currency,status,to_financial_account_id',
          )
          .order('transaction_date', {
            ascending: false,
          })
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('accounts')
          .select(
            'id,business_id,platform_id,name,created_at,updated_at,default_financial_account_id',
          )
          .order('name'),

        supabase
          .from('businesses')
          .select('id,name')
          .order('name'),

        supabase
          .from('platforms')
          .select('id,name')
          .order('name'),

        supabase
          .from('financial_accounts')
          .select('id,name')
          .order('name'),
      ])

      const bad = r.find((x) => x.error)

      if (bad?.error) {
        throw bad.error
      }

      setTransactions((r[0].data ?? []) as Transaction[])
      setAccounts((r[1].data ?? []) as Account[])
      setBusinesses((r[2].data ?? []) as Named[])
      setPlatforms((r[3].data ?? []) as Named[])
      setFinancialAccounts((r[4].data ?? []) as Named[])

      setBusinessFilter((v) =>
        v &&
        (r[2].data ?? []).some(
          (x) => x.id === v,
        )
          ? v
          : (r[2].data ?? [])[0]?.id ?? '',
      )
    } catch (e) {
      console.error(e)
      setError(
        e instanceof Error
          ? e.message
          : 'تعذر تحميل البيانات من Supabase',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const accountMap = useMemo(
    () => new Map(accounts.map((x) => [x.id, x])),
    [accounts],
  )

  const businessMap = useMemo(
    () => new Map(businesses.map((x) => [x.id, x.name])),
    [businesses],
  )

  const platformMap = useMemo(
    () => new Map(platforms.map((x) => [x.id, x.name])),
    [platforms],
  )

  const financialMap = useMemo(
    () =>
      new Map(
        financialAccounts.map((x) => [x.id, x.name]),
      ),
    [financialAccounts],
  )

  const companyAccounts = useMemo(
    () =>
      accounts.filter(
        (x) => x.business_id === businessFilter,
      ),
    [accounts, businessFilter],
  )

  const safeColumnCount = Math.max(
    1,
    Math.min(
      columnCount,
      Math.max(companyAccounts.length, 1),
    ),
  )

  const filtered = useMemo(
    () =>
      transactions
        .filter((t) => {
          if (t.business_id !== businessFilter) {
            return false
          }

          const a = t.account_id
            ? accountMap.get(t.account_id)
            : null

          const text = [
            t.description,
            t.transaction_type,
            a?.name,
            businessMap.get(t.business_id),
            platformMap.get(a?.platform_id ?? ''),
            financialMap.get(
              a?.default_financial_account_id ?? '',
            ),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          const d = dateOnly(t.transaction_date)
          const q = search.trim().toLowerCase()

          return (
            (!q || text.includes(q)) &&
            (accountFilter === 'all' ||
              t.account_id === accountFilter) &&
            (typeFilter === 'all' ||
              t.transaction_type === typeFilter) &&
            (!dateFrom || d >= dateFrom) &&
            (!dateTo || d <= dateTo)
          )
        })
        .sort((a, b) => {
          const d = dateOnly(
            b.transaction_date,
          ).localeCompare(
            dateOnly(a.transaction_date),
          )

          return (
            d ||
            (b.created_at ?? '').localeCompare(
              a.created_at ?? '',
            )
          )
        }),
    [
      transactions,
      accountMap,
      businessMap,
      platformMap,
      financialMap,
      businessFilter,
      search,
      accountFilter,
      typeFilter,
      dateFrom,
      dateTo,
    ],
  )

  const transactionsByAccount = useMemo(() => {
    const m = new Map<string, Transaction[]>()

    companyAccounts.forEach((a) =>
      m.set(a.id, []),
    )

    filtered.forEach((t) => {
      if (
        t.transaction_type === 'transfer' &&
        t.account_id
      ) {
        m.get(t.account_id)?.push(t)
      }
    })

    return m
  }, [companyAccounts, filtered])

  const expenses = useMemo(
    () =>
      filtered
        .filter(
          (t) => t.transaction_type === 'expense',
        )
        .sort(
          (a, b) =>
            dateOnly(b.transaction_date).localeCompare(
              dateOnly(a.transaction_date),
            ) ||
            (b.created_at ?? '').localeCompare(
              a.created_at ?? '',
            ),
        ),
    [filtered],
  )

  const expensesByDate = useMemo(() => {
    const m = new Map<string, Transaction[]>()

    expenses.forEach((e) => {
      const d = dateOnly(e.transaction_date)

      m.set(d, [
        ...(m.get(d) ?? []),
        e,
      ])
    })

    return m
  }, [expenses])

  const timelineDates = useMemo(() => {
    const s = new Set<string>()

    expenses.forEach((e) =>
      s.add(dateOnly(e.transaction_date)),
    )

    companyAccounts.forEach((a) =>
      (
        transactionsByAccount.get(a.id) ?? []
      ).forEach((t) =>
        s.add(dateOnly(t.transaction_date)),
      ),
    )

    return [...s]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
  }, [
    expenses,
    companyAccounts,
    transactionsByAccount,
  ])

  const balances = useMemo(() => {
    const m = new Map<string, number>()

    companyAccounts.forEach((a) =>
      m.set(a.id, 0),
    )

    transactions.forEach((t) => {
      if (
        t.business_id === businessFilter &&
        t.transaction_type === 'transfer' &&
        t.account_id
      ) {
        m.set(
          t.account_id,
          (m.get(t.account_id) ?? 0) +
            Number(t.amount || 0),
        )
      }
    })

    return m
  }, [
    transactions,
    companyAccounts,
    businessFilter,
  ])

  const totalTransfers = filtered
    .filter(
      (t) => t.transaction_type === 'transfer',
    )
    .reduce(
      (s, t) => s + Number(t.amount || 0),
      0,
    )

  const totalExpenses = filtered
    .filter(
      (t) => t.transaction_type === 'expense',
    )
    .reduce(
      (s, t) => s + Number(t.amount || 0),
      0,
    )

  const companyTransfers = transactions
    .filter(
      (t) =>
        t.business_id === businessFilter &&
        t.transaction_type === 'transfer',
    )
    .reduce(
      (s, t) => s + Number(t.amount || 0),
      0,
    )

  const companyExpenses = transactions
    .filter(
      (t) =>
        t.business_id === businessFilter &&
        t.transaction_type === 'expense',
    )
    .reduce(
      (s, t) => s + Number(t.amount || 0),
      0,
    )

  const currentBalance =
    companyTransfers - companyExpenses

  const changeBusiness = (v: string) => {
    setBusinessFilter(v)
    setAccountFilter('all')
    setSelectedTransactionId(null)
    setSearch('')
  }

  const clearFilters = () => {
    setSearch('')
    setAccountFilter('all')
    setTypeFilter('all')
    setDateFrom('')
    setDateTo('')
    setSelectedTransactionId(null)
  }

  const openTransaction = (
    type: 'transfer' | 'expense',
    accountId = '',
    item?: Transaction,
  ) => {
    if (item) {
      setEditingTransaction(item)
      setSelectedTransactionId(item.id)

      setTransactionForm({
        transaction_type:
          item.transaction_type === 'expense'
            ? 'expense'
            : 'transfer',
        transaction_date: dateOnly(
          item.transaction_date,
        ),
        amount: String(item.amount),
        account_id: item.account_id ?? '',
        description: item.description ?? '',
      })
    } else {
      setEditingTransaction(null)
      setSelectedTransactionId(null)

      setTransactionForm(
        blankTx(
          type === 'transfer'
            ? accountId
            : '',
          type,
        ),
      )
    }

    setShowTransactionModal(true)
  }

  const closeTransaction = () => {
    setShowTransactionModal(false)
    setEditingTransaction(null)
    setSelectedTransactionId(null)
    setTransactionForm(blankTx())
  }

  const openAccount = (a?: Account) => {
    if (a) {
      setEditingAccount(a)

      setAccountForm({
        name: a.name,
        business_id: a.business_id,
        platform_id: a.platform_id ?? '',
        default_financial_account_id:
          a.default_financial_account_id ?? '',
      })
    } else {
      setEditingAccount(null)

      setAccountForm({
        ...blankAccount(),
        business_id:
          businessFilter ||
          businesses[0]?.id ||
          '',
        platform_id:
          platforms[0]?.id || '',
        default_financial_account_id:
          financialAccounts[0]?.id || '',
      })
    }

    setShowAccountModal(true)
  }

  const closeAccount = () => {
    setShowAccountModal(false)
    setEditingAccount(null)
    setAccountForm(blankAccount())
  }

  const saveTransaction = async () => {
    if (
      !transactionForm.transaction_date ||
      !transactionForm.amount
    ) {
      setError('أدخل المبلغ والتاريخ أولًا')
      return
    }

    const amount = Number(
      transactionForm.amount,
    )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError('أدخل مبلغ صحيح')
      return
    }

    let account: Account | null = null

    if (
      transactionForm.transaction_type ===
      'transfer'
    ) {
      if (!transactionForm.account_id) {
        setError(
          'اختر الحساب الخاص بالتحويل',
        )
        return
      }

      account =
        accountMap.get(
          transactionForm.account_id,
        ) ?? null

      if (!account) {
        setError('الحساب غير موجود')
        return
      }

      if (
        account.business_id !==
        businessFilter
      ) {
        setError(
          'الحساب لا يتبع الشركة المحددة',
        )
        return
      }
    }

    const businessId =
      transactionForm.transaction_type ===
      'expense'
        ? businessFilter
        : account?.business_id

    if (!businessId) {
      setError('الشركة غير محددة')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      business_id: businessId,

      account_id:
        transactionForm.transaction_type ===
        'expense'
          ? null
          : transactionForm.account_id,

      transaction_date: dbDate(
        transactionForm.transaction_date,
      ),

      amount,

      transaction_type:
        transactionForm.transaction_type,

      description:
        transactionForm.description.trim() ||
        null,

      currency: 'EGP',
      status: 'completed',

      to_financial_account_id:
        transactionForm.transaction_type ===
        'transfer'
          ? account
              ?.default_financial_account_id ||
            null
          : null,
    }

    try {
      const r = editingTransaction
        ? await supabase
            .from('transactions')
            .update({
              ...payload,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              editingTransaction.id,
            )
        : await supabase
            .from('transactions')
            .insert({
              ...payload,
              created_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            })

      if (r.error) {
        throw r.error
      }

      const wasEdit =
        !!editingTransaction

      closeTransaction()

      setNotice(
        wasEdit
          ? 'تم تعديل الحركة بنجاح'
          : transactionForm.transaction_type ===
              'expense'
            ? 'تمت إضافة المصروف للشركة بنجاح'
            : 'تمت إضافة التحويل بنجاح',
      )

      await fetchData()
    } catch (e) {
      console.error(e)

      setError(
        e instanceof Error
          ? e.message
          : 'تعذر حفظ الحركة',
      )
    } finally {
      setSaving(false)
    }
  }

  const deleteTransaction = async (
    t: Transaction,
  ) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الحركة بقيمة ${money(
          Number(t.amount || 0),
        )} ج.م؟`,
      )
    ) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const r = await supabase
        .from('transactions')
        .delete()
        .eq('id', t.id)

      if (r.error) {
        throw r.error
      }

      setSelectedTransactionId(null)

      setNotice(
        t.transaction_type === 'expense'
          ? 'تم حذف المصروف بنجاح'
          : 'تم حذف التحويل بنجاح',
      )

      await fetchData()
    } catch (e) {
      console.error(e)

      setError(
        e instanceof Error
          ? e.message
          : 'تعذر حذف الحركة',
      )
    } finally {
      setSaving(false)
    }
  }

  const saveAccount = async () => {
    if (
      !accountForm.name.trim() ||
      !accountForm.business_id
    ) {
      setError(
        'أدخل اسم الحساب واختر الشركة',
      )
      return
    }

    setSaving(true)
    setError('')

    const p = {
      name: accountForm.name.trim(),
      business_id:
        accountForm.business_id,
      platform_id:
        accountForm.platform_id || null,
      default_financial_account_id:
        accountForm
          .default_financial_account_id ||
        null,
    }

    try {
      const r = editingAccount
        ? await supabase
            .from('accounts')
            .update({
              ...p,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              editingAccount.id,
            )
        : await supabase
            .from('accounts')
            .insert({
              ...p,
              created_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            })

      if (r.error) {
        throw r.error
      }

      const edit = !!editingAccount

      closeAccount()

      setNotice(
        edit
          ? 'تم تعديل الحساب بنجاح'
          : 'تم إضافة الحساب بنجاح',
      )

      await fetchData()
    } catch (e) {
      console.error(e)

      setError(
        e instanceof Error
          ? e.message
          : 'تعذر حفظ الحساب',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="الإدارة المالية">
      <style>{`
        .action-button{
          display:inline-flex;
          height:2.65rem;
          align-items:center;
          justify-content:center;
          gap:.45rem;
          border-radius:.7rem;
          border:1px solid rgba(255,255,255,.1);
          padding:0 1rem;
          font-size:.82rem;
          font-weight:700;
          transition:.2s
        }

        .action-button:hover{
          background:rgba(255,255,255,.05)
        }

        .action-button.primary{
          border-color:transparent;
          background:#823292;
          color:#fff
        }

        .action-button.primary:hover{
          background:#9d43ad
        }

        .field{
          margin-top:.35rem;
          min-height:2.45rem;
          width:100%;
          border-radius:.55rem;
          border:1px solid rgba(255,255,255,.1);
          background:rgba(0,0,0,.22);
          padding:0 .75rem;
          color:#fff;
          outline:none
        }

        .field:focus{
          border-color:#823292
        }

        .field option{
          background:#111114;
          color:#fff
        }

        .accounts-grid{
          display:grid;
          grid-template-columns:repeat(
            var(--account-columns),
            minmax(0,1fr)
          );
          gap:.75rem;
          width:100%
        }

        .account-transaction-cell{
          min-width:0;
          width:100%
        }

        .company-expense-divider{
          grid-column:1/-1;
          width:100%;
          min-width:0
        }

        .company-expense-divider-card{
          width:100%
        }

        @media(max-width:1100px){
          .accounts-grid{
            grid-template-columns:repeat(
              min(2,var(--account-columns)),
              minmax(0,1fr)
            )
          }
        }

        @media(max-width:700px){
          .accounts-grid{
            grid-template-columns:1fr
          }
        }
      `}</style>

      <main
        dir="rtl"
        className="mx-auto w-full max-w-[1800px] space-y-5"
      >
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-400">
              الإدارة المالية
            </p>

            <h1 className="mt-1 text-3xl font-black">
              كشف حركة الحسابات
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              متابعة الرصيد والحركة لكل حساب
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openAccount()}
              className="action-button"
            >
              <Plus className="h-4 w-4" />
              حساب جديد
            </button>

            <button
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="action-button"
            >
              <RefreshCw
                className={
                  refreshing
                    ? 'h-4 w-4 animate-spin'
                    : 'h-4 w-4'
                }
              />
              تحديث
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              onClick={() => setError('')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
            <span>{notice}</span>

            <button
              onClick={() => setNotice('')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-xs text-zinc-500">
              الشركة

              <select
                value={businessFilter}
                onChange={(e) =>
                  changeBusiness(
                    e.target.value,
                  )
                }
                className="field"
              >
                <option
                  value=""
                  disabled
                >
                  اختر الشركة
                </option>

                {businesses.map((x) => (
                  <option
                    key={x.id}
                    value={x.id}
                  >
                    {x.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-500">
              عدد الأعمدة

              <select
                value={safeColumnCount}
                onChange={(e) =>
                  setColumnCount(
                    Number(
                      e.target.value,
                    ),
                  )
                }
                className="field"
              >
                {Array.from(
                  {
                    length: Math.max(
                      companyAccounts.length,
                      1,
                    ),
                  },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option
                    key={n}
                    value={n}
                  >
                    {n}{' '}
                    {n === 1
                      ? 'عمود'
                      : 'أعمدة'}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <div
                className={`w-full rounded-xl border p-3 ${
                  currentBalance >= 0
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <p className="text-[10px] text-zinc-500">
                  صافي قيمة الشركة
                </p>

                <p
                  className={`mt-1 text-xl font-black ${
                    currentBalance >= 0
                      ? 'text-green-300'
                      : 'text-red-300'
                  }`}
                >
                  {money(currentBalance)} ج.م
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary
            label="صافي قيمة الشركة"
            value={`${money(
              currentBalance,
            )} ج.م`}
            icon={
              <Wallet className="h-5 w-5" />
            }
          />

          <Summary
            label="إجمالي التحويلات"
            value={`${money(
              totalTransfers,
            )} ج.م`}
            icon={
              <ArrowDownLeft className="h-5 w-5" />
            }
          />

          <Summary
            label="إجمالي مصروفات الشركة"
            value={`${money(
              totalExpenses,
            )} ج.م`}
            icon={
              <ArrowUpRight className="h-5 w-5" />
            }
          />

          <Summary
            label="عدد الحركات"
            value={String(
              filtered.length,
            )}
            icon={
              <Database className="h-5 w-5" />
            }
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Search className="h-4 w-4 text-zinc-500" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              placeholder="بحث بالحساب أو البيان..."
              className="h-10 min-w-[220px] flex-1 bg-transparent text-sm outline-none"
            />

            <button
              onClick={() =>
                setFiltersOpen(
                  (v) => !v,
                )
              }
              className="action-button"
            >
              فلترة
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="الحساب"
                value={accountFilter}
                onChange={setAccountFilter}
                options={companyAccounts}
              />

              <Select
                label="نوع الحركة"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  {
                    id: 'transfer',
                    name: 'تحويل',
                  },
                  {
                    id: 'expense',
                    name: 'مصروف',
                  },
                ]}
              />

              <DateFilter
                label="من تاريخ"
                value={dateFrom}
                onChange={setDateFrom}
              />

              <DateFilter
                label="إلى تاريخ"
                value={dateTo}
                onChange={setDateTo}
              />

              <button
                onClick={clearFilters}
                className="self-end rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:bg-white/5"
              >
                مسح الفلاتر
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : !companyAccounts.length ? (
          <Empty text="لا توجد حسابات لهذه الشركة" />
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#09090b] p-3">
            <div
              className="accounts-grid"
              style={
                {
                  '--account-columns':
                    safeColumnCount,
                } as React.CSSProperties
              }
            >
              {companyAccounts
                .slice(
                  0,
                  safeColumnCount,
                )
                .map((a) => (
                  <AccountLedgerHeader
                    key={`h-${a.id}`}
                    account={a}
                    balance={
                      balances.get(a.id) ?? 0
                    }
                    platformName={
                      platformMap.get(
                        a.platform_id ?? '',
                      ) ??
                      'منصة غير محددة'
                    }
                    onAddTransfer={() =>
                      openTransaction(
                        'transfer',
                        a.id,
                      )
                    }
                    onAddExpense={() =>
                      openTransaction(
                        'expense',
                      )
                    }
                    onEditAccount={() =>
                      openAccount(a)
                    }
                  />
                ))}

              {timelineDates.map(
                (date) => (
                  <div
                    key={date}
                    className="contents"
                  >
                    {(expensesByDate.get(
                      date,
                    ) ?? []).map(
                      (e) => (
                        <CompanyExpenseDivider
                          key={e.id}
                          expense={e}
                          selected={
                            selectedTransactionId ===
                            e.id
                          }
                          saving={saving}
                          onSelect={() =>
                            setSelectedTransactionId(
                              selectedTransactionId ===
                                e.id
                                ? null
                                : e.id,
                            )
                          }
                          onEdit={() =>
                            openTransaction(
                              'expense',
                              '',
                              e,
                            )
                          }
                          onDelete={() =>
                            void deleteTransaction(
                              e,
                            )
                          }
                        />
                      ),
                    )}

                    {companyAccounts
                      .slice(
                        0,
                        safeColumnCount,
                      )
                      .map((a) => (
                        <AccountTransactionCell
                          key={`${a.id}-${date}`}
                          transactions={(
                            transactionsByAccount.get(
                              a.id,
                            ) ?? []
                          ).filter(
                            (t) =>
                              dateOnly(
                                t.transaction_date,
                              ) === date,
                          )}
                          selectedId={
                            selectedTransactionId
                          }
                          saving={saving}
                          onSelect={(id) =>
                            setSelectedTransactionId(
                              selectedTransactionId ===
                                id
                                ? null
                                : id,
                            )
                          }
                          onEdit={(t) =>
                            openTransaction(
                              'transfer',
                              t.account_id ??
                                a.id,
                              t,
                            )
                          }
                          onDelete={
                            deleteTransaction
                          }
                        />
                      ))}
                  </div>
                ),
              )}

              {!timelineDates.length && (
                <div
                  style={{
                    gridColumn: '1/-1',
                  }}
                  className="rounded-xl border border-white/10 py-12 text-center text-sm text-zinc-600"
                >
                  <Wallet className="mx-auto mb-2 h-7 w-7 text-zinc-700" />
                  لا توجد حركات لهذا الحساب حتى الآن
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {showTransactionModal && (
        <TransactionModal
          title={
            editingTransaction
              ? 'تعديل الحركة'
              : transactionForm.transaction_type ===
                  'expense'
                ? 'إضافة مصروف للشركة'
                : 'إضافة تحويل'
          }
          form={transactionForm}
          account={
            transactionForm.account_id
              ? accountMap.get(
                  transactionForm.account_id,
                ) ?? null
              : null
          }
          editing={
            !!editingTransaction
          }
          saving={saving}
          onChange={
            setTransactionForm
          }
          onClose={
            closeTransaction
          }
          onSave={() =>
            void saveTransaction()
          }
        />
      )}

      {showAccountModal && (
        <Modal
          title={
            editingAccount
              ? 'تعديل الحساب'
              : 'إضافة حساب'
          }
          onClose={closeAccount}
        >
          <FormField label="اسم الحساب">
            <input
              value={accountForm.name}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  name: e.target.value,
                })
              }
              className="field"
              placeholder="مثال: MarVelle Amazon"
            />
          </FormField>

          <FormField label="الشركة">
            <select
              value={
                accountForm.business_id
              }
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  business_id:
                    e.target.value,
                })
              }
              className="field"
            >
              <option
                value=""
                disabled
              >
                اختر الشركة
              </option>

              {businesses.map((x) => (
                <option
                  key={x.id}
                  value={x.id}
                >
                  {x.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="المنصة">
            <select
              value={
                accountForm.platform_id
              }
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  platform_id:
                    e.target.value,
                })
              }
              className="field"
            >
              <option value="">
                غير محدد
              </option>

              {platforms.map((x) => (
                <option
                  key={x.id}
                  value={x.id}
                >
                  {x.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="البنك المرتبط بالحساب">
            <select
              value={
                accountForm.default_financial_account_id
              }
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  default_financial_account_id:
                    e.target.value,
                })
              }
              className="field"
            >
              <option value="">
                اختر البنك
              </option>

              {financialAccounts.map(
                (x) => (
                  <option
                    key={x.id}
                    value={x.id}
                  >
                    {x.name}
                  </option>
                ),
              )}
            </select>
          </FormField>

          <Actions
            saving={saving}
            onCancel={closeAccount}
            onSave={() =>
              void saveAccount()
            }
          />
        </Modal>
      )}
    </AppShell>
  )
}

function CompanyExpenseDivider({
  expense,
  selected,
  saving,
  onSelect,
  onEdit,
  onDelete,
}: {
  expense: Transaction
  selected: boolean
  saving: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="company-expense-divider">
      <div
        onClick={onSelect}
        className={`company-expense-divider-card cursor-pointer rounded-2xl border p-3 text-white shadow-lg transition ${
          selected
            ? 'border-white/70 bg-[#4caf50]'
            : 'border-green-500/30 bg-[#4caf50] hover:bg-[#55b85a]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 shrink-0" />

            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {expense.description ||
                  'مصروف الشركة'}
              </p>

              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-white">
                <CalendarDays className="h-3 w-3" />
                {dateText(
                  expense.transaction_date,
                )}
              </div>
            </div>
          </div>

          <p className="shrink-0 whitespace-nowrap text-xl font-black">
            -
            {money(
              Number(
                expense.amount || 0,
              ),
            )}{' '}
            ج.م
          </p>
        </div>

        {selected && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2 text-[11px] font-black text-white hover:bg-white/20"
            >
              <Pencil className="h-3.5 w-3.5" />
              تعديل
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/20 py-2 text-[11px] font-black text-white hover:bg-red-500/30 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AccountLedgerHeader({
  account,
  balance,
  platformName,
  onAddTransfer,
  onAddExpense,
  onEditAccount,
}: {
  account: Account
  balance: number
  platformName: string
  onAddTransfer: () => void
  onAddExpense: () => void
  onEditAccount: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
      <div className="border-b border-white/10 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-white">
              {account.name}
            </h2>

            <p className="mt-1 truncate text-[10px] text-zinc-500">
              {platformName}
            </p>
          </div>

          <button
            onClick={onEditAccount}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
            title="تعديل الحساب"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className={`mt-3 rounded-xl border p-3 ${
            balance >= 0
              ? 'border-green-500/20 bg-green-500/5'
              : 'border-red-500/20 bg-red-500/5'
          }`}
        >
          <p className="text-[10px] text-zinc-500">
            الرصيد الحالي
          </p>

          <p
            className={`mt-1 text-xl font-black ${
              balance >= 0
                ? 'text-green-300'
                : 'text-red-300'
            }`}
          >
            {money(balance)} ج.م
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAddTransfer}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-purple-500"
          >
            <ArrowDownLeft className="h-4 w-4" />
            تحويل
          </button>

          <button
            type="button"
            onClick={onAddExpense}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-500/20"
          >
            <ArrowUpRight className="h-4 w-4" />
            مصروف
          </button>
        </div>

        <p className="mt-2 text-center text-[9px] text-zinc-600">
          المصروف يُسجل على الشركة بالكامل وليس على هذا الحساب
        </p>
      </div>
    </article>
  )
}

function AccountTransactionCell({
  transactions,
  selectedId,
  saving,
  onSelect,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[]
  selectedId: string | null
  saving: boolean
  onSelect: (id: string) => void
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  return (
    <div className="account-transaction-cell min-w-0">
      {!transactions.length ? (
        <div className="min-h-[18px]" />
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => {
            const selected =
              selectedId === t.id

            return (
              <div
                key={t.id}
                onClick={() =>
                  onSelect(t.id)
                }
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  selected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-[#111114] hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-green-500/10 px-2 py-1 text-[9px] font-black text-green-300">
                        تحويل
                      </span>

                      <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        <CalendarDays className="h-3 w-3" />
                        {dateText(
                          t.transaction_date,
                        )}
                      </div>
                    </div>

                    {t.description && (
                      <p className="mt-2 break-words text-xs font-semibold leading-5 text-zinc-300">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 whitespace-nowrap text-base font-black text-green-300">
                    +
                    {money(
                      Number(
                        t.amount || 0,
                      ),
                    )}{' '}
                    ج.م
                  </p>
                </div>

                {selected && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(t)
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2 text-[11px] font-black text-white hover:bg-purple-500"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(t)
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 py-2 text-[11px] font-black text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TransactionModal({
  title,
  form,
  account,
  editing,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  title: string
  form: TransactionForm
  account: Account | null
  editing: boolean
  saving: boolean
  onChange: (
    v: TransactionForm,
  ) => void
  onClose: () => void
  onSave: () => void
}) {
  const expense =
    form.transaction_type === 'expense'

  return (
    <Modal
      title={title}
      onClose={onClose}
    >
      {!editing && (
        <div>
          <p className="text-sm font-semibold text-zinc-400">
            نوع الحركة
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...form,
                  transaction_type:
                    'transfer',
                })
              }
              className={`rounded-xl border px-3 py-3 text-sm font-black ${
                !expense
                  ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                  : 'border-white/10 text-zinc-500 hover:bg-white/5'
              }`}
            >
              <ArrowDownLeft className="mx-auto mb-1 h-5 w-5" />
              تحويل
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...form,
                  transaction_type:
                    'expense',
                  account_id: '',
                })
              }
              className={`rounded-xl border px-3 py-3 text-sm font-black ${
                expense
                  ? 'border-red-500 bg-red-500/10 text-red-300'
                  : 'border-white/10 text-zinc-500 hover:bg-white/5'
              }`}
            >
              <ArrowUpRight className="mx-auto mb-1 h-5 w-5" />
              مصروف الشركة
            </button>
          </div>
        </div>
      )}

      {expense ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-[10px] text-zinc-500">
            نطاق المصروف
          </p>

          <p className="mt-1 text-sm font-black text-green-300">
            الشركة بالكامل
          </p>

          <p className="mt-1 text-[10px] leading-5 text-zinc-500">
            هذا المصروف لا يُخصم من حساب منفرد وإنما من إجمالي قيمة الشركة.
          </p>
        </div>
      ) : (
        <FormField label="الحساب">
          <input
            value={account?.name ?? ''}
            readOnly
            className="field"
          />
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="المبلغ">
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              onChange({
                ...form,
                amount:
                  e.target.value,
              })
            }
            className="field"
            placeholder="0"
          />
        </FormField>

        <FormField label="التاريخ">
          <input
            type="date"
            value={
              form.transaction_date
            }
            onChange={(e) =>
              onChange({
                ...form,
                transaction_date:
                  e.target.value,
              })
            }
            className="field"
          />
        </FormField>
      </div>

      <FormField label="البيان">
        <textarea
          value={form.description}
          onChange={(e) =>
            onChange({
              ...form,
              description:
                e.target.value,
            })
          }
          className="field min-h-[95px] resize-none py-2"
          placeholder={
            expense
              ? 'مثال: إيجار - رواتب - شحن - تسويق'
              : 'مثال: دفعة كريم - بضاعة'
          }
        />
      </FormField>

      <div
        className={`rounded-xl border p-3 text-xs ${
          expense
            ? 'border-green-500/20 bg-green-500/5 text-green-300'
            : 'border-purple-500/20 bg-purple-500/5 text-purple-300'
        }`}
      >
        {expense
          ? 'المصروف سيتم خصمه من إجمالي قيمة الشركة ولن يتم خصمه من Account منفرد.'
          : 'التحويل سيضاف إلى رصيد الحساب المحدد والبنك المرتبط بالحساب يتم أخذه تلقائيًا.'}
      </div>

      <Actions
        saving={saving}
        onCancel={onClose}
        onSave={onSave}
      />
    </Modal>
  )
}

function Summary({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            {label}
          </p>

          <p className="mt-2 text-xl font-black">
            {value}
          </p>
        </div>

        <span className="rounded-xl bg-purple-600/15 p-3 text-purple-400">
          {icon}
        </span>
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Named[]
}) {
  return (
    <label className="text-xs text-zinc-500">
      {label}

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value,
          )
        }
        className="field"
      >
        <option value="all">
          الكل
        </option>

        {options.map((x) => (
          <option
            key={x.id}
            value={x.id}
          >
            {x.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="text-xs text-zinc-500">
      {label}

      <input
        type="date"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value,
          )
        }
        className="field"
      />
    </label>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm text-zinc-400">
      {label}
      {children}
    </label>
  )
}

function Actions({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
      <button
        onClick={onCancel}
        disabled={saving}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        إلغاء
      </button>

      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-black hover:bg-purple-500 disabled:opacity-50"
      >
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        حفظ
      </button>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function Empty({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-zinc-500">
      <Database className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
      {text}
    </div>
  )
}