import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet, CreditCard, X } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import Reveal from '@/components/Reveal';
import {
    CATEGORY_LABELS,
    installmentInvoiceMonths,
    CHART_COLORS,
    currentMonthKey,
    formatBRL,
    formatDateBR,
    monthKey,
    monthLabel,
} from '@/lib/finance';

const INTRO_KEY = 'contrapeso:intro-dismissed';

function IntroPanel() {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        setDismissed(localStorage.getItem(INTRO_KEY) === '1');
    }, []);

    if (dismissed) return null;

    const close = () => {
        localStorage.setItem(INTRO_KEY, '1');
        setDismissed(true);
    };

    return (
        <Reveal>
            <div className="relative mb-6 rounded-xl border border-border bg-card p-5">
                <button
                    type="button"
                    onClick={close}
                    aria-label="Fechar"
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
                <h2 className="font-serif text-xl italic">Como funciona, em 3 passos</h2>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>
                        <strong className="text-foreground">1. Lance suas entradas e saídas</strong> em{' '}
                        <Link to="/transacoes" className="underline decoration-accent decoration-2 underline-offset-4">Transações</Link>.
                        Toda vez que dinheiro entra ou sai de verdade (Pix, dinheiro, débito), registre aqui.
                    </li>
                    <li>
                        <strong className="text-foreground">2. Cadastre seus cartões</strong> em{' '}
                        <Link to="/cartoes" className="underline decoration-accent decoration-2 underline-offset-4">Cartões</Link>.
                        Crédito tem limite e fatura; débito não precisa cadastro, ele já usa seu saldo.
                    </li>
                    <li>
                        <strong className="text-foreground">3. Acompanhe aqui</strong> o quanto você tem, quanto já
                        entrou e saiu no mês, e para onde o dinheiro está indo.
                    </li>
                </ol>
            </div>
        </Reveal>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState(null);
    const [investments, setInvestments] = useState(null);
    const [cards, setCards] = useState(null);
    const [purchases, setPurchases] = useState(null);
    const [invoices, setInvoices] = useState(null);
    const [accounts, setAccounts] = useState(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            pb.collection('transactions').getFullList({ sort: '-date' }),
            pb.collection('investments').getFullList({ sort: 'asset' }),
            pb.collection('credit_cards').getFullList({ sort: 'name' }),
            pb.collection('card_purchases').getFullList({ sort: '-purchase_date' }),
            pb.collection('card_invoices').getFullList({ sort: '-reference_month' }),
            pb.collection('accounts').getFullList({ sort: 'name' }),
        ])
            .then(([tx, inv, cardRows, purchaseRows, invoiceRows, accountRows]) => {
                if (cancelled) return;
                setTransactions(tx);
                setInvestments(inv);
                setCards(cardRows);
                setPurchases(purchaseRows);
                setInvoices(invoiceRows);
                setAccounts(accountRows);
            })
            .catch((err) => {
                console.error('Falha ao carregar visão geral', err);
                if (!cancelled) {
                    setTransactions([]);
                    setInvestments([]);
                    setCards([]);
                    setPurchases([]);
                    setInvoices([]);
                    setAccounts([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const stats = useMemo(() => {
        if (!transactions || !investments || !cards || !purchases || !invoices || !accounts) return null;
        const month = currentMonthKey();
        let entradasMes = 0;
        let saidasMes = 0;
        let saldo = 0;
        const byCategory = {};

        const keys = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        const monthly = keys.map((key) => ({ key, name: monthLabel(key), entradas: 0, saidas: 0 }));

        transactions.forEach((t) => {
            const sign = t.type === 'entrada' ? 1 : -1;
            // Compras no cartão comprometem crédito, mas só saem do caixa quando a fatura é paga.
            if (!['cartao','beneficio'].includes(t.payment_method)) saldo += sign * Number(t.amount || 0);
            if (monthKey(t.date) === month) {
                if (t.type === 'entrada') entradasMes += t.amount;
                else {
                    saidasMes += t.amount;
                    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
                }
            }
            const row = monthly.find((m) => m.key === monthKey(t.date));
            if (row) row[t.type === 'entrada' ? 'entradas' : 'saidas'] += t.amount;
        });

        // Compras de cartão entram no mês da respectiva parcela, mesmo quando foram lançadas pela tela de Transações.
        purchases.forEach((purchase) => {
            const card = cards.find(c => c.id === purchase.card_id);
            const isCredit = (card?.card_type || 'credito') === 'credito';
            const linked = transactions.some(t => t.card_purchase_id === purchase.id);
            if (isCredit && card?.closing_day) {
                const each = Number(purchase.amount || 0) / Math.max(1, Number(purchase.installments || 1));
                installmentInvoiceMonths(purchase, card.closing_day).forEach((purchaseMonth) => {
                    const row = monthly.find((m) => m.key === purchaseMonth);
                    if (purchaseMonth === month) {
                        saidasMes += each;
                        byCategory[purchase.category] = (byCategory[purchase.category] || 0) + each;
                    }
                    if (row) row.saidas += each;
                });
            } else if (!linked) {
                const purchaseMonth = monthKey(purchase.purchase_date);
                if (purchaseMonth === month) {
                    saidasMes += Number(purchase.amount || 0);
                    byCategory[purchase.category] = (byCategory[purchase.category] || 0) + Number(purchase.amount || 0);
                }
                const row = monthly.find((m) => m.key === purchaseMonth);
                if (row) row.saidas += Number(purchase.amount || 0);
            }
        });

        let investido = 0;
        let carteira = 0;
        investments.forEach((i) => {
            const current = i.currentPrice > 0 ? i.currentPrice : i.avgPrice;
            investido += i.quantity * i.avgPrice;
            carteira += i.quantity * current;
        });

        const categorias = Object.entries(byCategory)
            .map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const cardData = cards.filter(card => (card.card_type || 'credito') === 'credito').map(card => {
            const paid = new Set(invoices.filter(i => i.card_id === card.id && i.status === 'paid').map(i => i.reference_month));
            const installments = purchases.filter(p => p.card_id === card.id).flatMap(p => {
                const each = Number(p.amount || 0) / Math.max(1, Number(p.installments || 1));
                return installmentInvoiceMonths(p, card.closing_day).map((month, index) => ({ month, value: each, index }));
            });
            const committed = installments.filter(x => !paid.has(x.month)).reduce((sum,x)=>sum+x.value,0);
            return { card, committed, available: Math.max(0, Number(card.credit_limit || 0) - committed) };
        });
        const benefitData = cards.filter(card => (card.card_type || 'credito') !== 'credito').map(card => {
            const spent = purchases.filter(p => p.card_id === card.id).reduce((sum,p) => sum + Number(p.amount || 0), 0);
            return { card, spent, available: Math.max(0, Number(card.initial_balance || 0) - spent) };
        });
        const limiteTotal = cardData.reduce((sum,x)=>sum+Number(x.card.credit_limit||0),0);
        const comprometido = cardData.reduce((sum,x)=>sum+x.committed,0);
        const disponivelCredito = cardData.reduce((sum,x)=>sum+x.available,0);
        const disponivelReal = saldo - comprometido;
        const disponivelBeneficios = benefitData.reduce((sum,x)=>sum+x.available,0);
        const gastoDebitoMes = transactions.filter(t=>t.payment_method==='debito' && t.type==='saida' && monthKey(t.date)===month).reduce((sum,t)=>sum+Number(t.amount||0),0);
        return { month, entradasMes, saidasMes, saldo, monthly, categorias, investido, carteira, limiteTotal, comprometido, disponivelCredito, disponivelReal, cardData, benefitData, disponivelBeneficios, gastoDebitoMes };
    }, [transactions, investments, cards, purchases, invoices, accounts]);

    const loading = !stats;
    const firstName = (user?.name || '').split(' ')[0];

    return (
        <div>
<Reveal>
                <header className="relative mb-10">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                        Visão geral
                    </p>
                    <h1 className="mt-1 max-w-xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                        {firstName ? `${firstName}, ` : ''}seu dinheiro{' '}
                        <span className="font-serif italic font-medium">em contrapeso.</span>
                    </h1>
                    <span
                        aria-hidden="true"
                        className="absolute -top-3 right-0 hidden -rotate-6 border-2 border-foreground bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest md:block"
                    >
                        mês corrente
                    </span>
                </header>
            </Reveal>

            {!loading && <IntroPanel />}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
                    ))}
                </div>
            ) : (
                <>
                    <Reveal delay={0.08}>
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl bg-primary p-5 text-primary-foreground">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                                    <Wallet className="h-4 w-4" /> Saldo atual
                                </div>
                                <p className="mt-3 text-3xl font-bold text-accent">
                                    {formatBRL(stats.saldo)}
                                </p>
                                <p className="mt-1 text-xs text-primary-foreground/60">
                                    tudo que entrou menos tudo que saiu (dinheiro, conta e débito)
                                </p>
                            </div>
                            <Link to="/cartoes" className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <CreditCard className="h-4 w-4" /> Crédito comprometido
                                </div>
                                <p className="mt-3 text-3xl font-bold">{formatBRL(stats.comprometido)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">quanto você já gastou no crédito e ainda vai pagar</p>
                            </Link>
                            <Link
                                to={`/transacoes?tipo=entrada&mes=${stats.month}`}
                                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <ArrowUpRight className="h-4 w-4 text-positive" /> Entradas no mês
                                </div>
                                <p className="mt-3 text-3xl font-bold text-positive">
                                    {formatBRL(stats.entradasMes)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">toque para ver os lançamentos</p>
                            </Link>
                            <Link
                                to={`/transacoes?tipo=saida&mes=${stats.month}`}
                                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <ArrowDownLeft className="h-4 w-4 text-negative" /> Saídas no mês
                                </div>
                                <p className="mt-3 text-3xl font-bold text-negative">
                                    {formatBRL(stats.saidasMes)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">toque para ver o que você gastou</p>
                            </Link>
                            <Link
                                to="/investimentos"
                                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <PiggyBank className="h-4 w-4" /> Investimentos
                                </div>
                                <p className="mt-3 text-3xl font-bold">{formatBRL(stats.carteira)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    custo {formatBRL(stats.investido)} ·{' '}
                                    <span className={stats.carteira >= stats.investido ? 'text-positive' : 'text-negative'}>
                                        {formatBRL(stats.carteira - stats.investido)}
                                    </span>
                                </p>
                            </Link>
                        </section>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <section className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Disponível real</p><p className="mt-2 text-2xl font-bold">{formatBRL(stats.disponivelReal)}</p><p className="mt-1 text-xs text-muted-foreground">seu saldo já descontando o que está comprometido no crédito</p></div>
                            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Benefícios disponíveis</p><p className="mt-2 text-2xl font-bold text-positive">{formatBRL(stats.disponivelBeneficios)}</p><p className="mt-1 text-xs text-muted-foreground">alimentação, refeição e outros vales</p></div>
                            <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Gasto no débito</p><p className="mt-2 text-2xl font-bold">{formatBRL(stats.gastoDebitoMes)}</p><p className="mt-1 text-xs text-muted-foreground">no mês corrente, já incluído no saldo atual</p></div>
                        </section>
                    </Reveal>

                    <section className="mt-6 grid gap-4 lg:grid-cols-3">
                        <Reveal delay={0.12} className="lg:col-span-2">
                            <div className="h-full rounded-xl border border-border bg-card p-5">
                                <h2 className="font-serif text-xl italic">Entradas × saídas</h2>
                                <p className="text-xs text-muted-foreground">últimos 6 meses</p>
                                <div className="mt-4 h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.monthly} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 16% 85%)" vertical={false} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                fontSize={11}
                                                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                                            />
                                            <Tooltip
                                                formatter={(v) => formatBRL(v)}
                                                cursor={{ fill: 'hsl(44 24% 89%)' }}
                                            />
                                            <Bar dataKey="entradas" name="Entradas" fill="hsl(152 48% 30%)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="saidas" name="Saídas" fill="hsl(8 68% 42%)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Reveal>

                        <Reveal delay={0.2}>
                            <div className="h-full rounded-xl bg-accent p-5 text-accent-foreground">
                                <h2 className="font-serif text-xl italic">Para onde vai</h2>
                                <p className="text-xs opacity-70">saídas do mês por categoria</p>
                                {stats.categorias.length === 0 ? (
                                    <p className="mt-10 text-sm font-medium">
                                        Nenhuma saída lançada neste mês.
                                    </p>
                                ) : (
                                    <>
                                        <div className="mt-2 h-44">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.categorias}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        innerRadius={42}
                                                        outerRadius={70}
                                                        strokeWidth={2}
                                                        stroke="hsl(71 93% 55%)"
                                                    >
                                                        {stats.categorias.map((c, i) => (
                                                            <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => formatBRL(v)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <ul className="mt-2 space-y-1 text-xs font-medium">
                                            {stats.categorias.slice(0, 4).map((c, i) => (
                                                <li key={c.name} className="flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5"
                                                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                                                        />
                                                        {c.name}
                                                    </span>
                                                    {formatBRL(c.value)}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </Reveal>
                    </section>

                    <Reveal delay={0.16}>
                        <section className="mt-6 rounded-xl border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                <h2 className="font-serif text-xl italic">Últimos lançamentos</h2>
                                <Link
                                    to="/transacoes"
                                    className="text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4"
                                >
                                    Ver todas
                                </Link>
                            </div>
                            {transactions.length === 0 ? (
                                <p className="px-5 py-10 text-sm text-muted-foreground">
                                    Nenhuma transação ainda. Comece em{' '}
                                    <Link to="/transacoes" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
                                        Transações
                                    </Link>
                                    .
                                </p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {transactions.slice(0, 6).map((t) => (
                                        <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold">{t.description}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {CATEGORY_LABELS[t.category] || t.category} · {formatDateBR(t.date)}
                                                </p>
                                            </div>
                                            <p
                                                className={
                                                    t.type === 'entrada'
                                                        ? 'shrink-0 text-sm font-bold text-positive'
                                                        : 'shrink-0 text-sm font-bold text-negative'
                                                }
                                            >
                                                {t.type === 'entrada' ? '+' : '−'} {formatBRL(t.amount)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </Reveal>
                </>
            )}
        </div>
    );
}
