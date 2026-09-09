import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet, CreditCard } from 'lucide-react';
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

export default function DashboardPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState(null);
    const [investments, setInvestments] = useState(null);
    const [cards, setCards] = useState(null);
    const [purchases, setPurchases] = useState(null);
    const [invoices, setInvoices] = useState(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            pb.collection('transactions').getFullList({ sort: '-date' }),
            pb.collection('investments').getFullList({ sort: 'asset' }),
            pb.collection('credit_cards').getFullList({ sort: 'name' }),
            pb.collection('card_purchases').getFullList({ sort: '-purchase_date' }),
            pb.collection('card_invoices').getFullList({ sort: '-reference_month' }),
        ])
            .then(([tx, inv, cardRows, purchaseRows, invoiceRows]) => {
                if (cancelled) return;
                setTransactions(tx);
                setInvestments(inv);
                setCards(cardRows);
                setPurchases(purchaseRows);
                setInvoices(invoiceRows);
            })
            .catch((err) => {
                console.error('Falha ao carregar visão geral', err);
                if (!cancelled) {
                    setTransactions([]);
                    setInvestments([]);
                    setCards([]);
                    setPurchases([]);
                    setInvoices([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const stats = useMemo(() => {
        if (!transactions || !investments || !cards || !purchases || !invoices) return null;
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
            if (t.payment_method !== 'cartao') saldo += sign * t.amount;
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

        // Compras feitas diretamente na área Cartões também entram no gasto do mês.
        // Compras criadas pela tela de Transações já possuem card_purchase_id e não são duplicadas.
        purchases.forEach((purchase) => {
            const purchaseMonth = monthKey(purchase.purchase_date);
            const alreadyLinked = transactions.some(t => t.card_purchase_id === purchase.id);
            if (purchaseMonth === month && !alreadyLinked) {
                saidasMes += Number(purchase.amount || 0);
                byCategory[purchase.category] = (byCategory[purchase.category] || 0) + Number(purchase.amount || 0);
            }
            const row = monthly.find((m) => m.key === purchaseMonth);
            if (row && !alreadyLinked) row.saidas += Number(purchase.amount || 0);
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

        const cardData = cards.map(card => {
            const paid = new Set(invoices.filter(i => i.card_id === card.id && i.status === 'paid').map(i => i.reference_month));
            const installments = purchases.filter(p => p.card_id === card.id).flatMap(p => {
                const each = Number(p.amount || 0) / Math.max(1, Number(p.installments || 1));
                return installmentInvoiceMonths(p, card.closing_day).map((month, index) => ({ month, value: each, index }));
            });
            const committed = installments.filter(x => !paid.has(x.month)).reduce((sum,x)=>sum+x.value,0);
            return { card, committed, available: Math.max(0, Number(card.credit_limit || 0) - committed) };
        });
        const limiteTotal = cardData.reduce((sum,x)=>sum+Number(x.card.credit_limit||0),0);
        const comprometido = cardData.reduce((sum,x)=>sum+x.committed,0);
        const disponivelCredito = cardData.reduce((sum,x)=>sum+x.available,0);
        const disponivelReal = saldo - comprometido;
        return { entradasMes, saidasMes, saldo, monthly, categorias, investido, carteira, limiteTotal, comprometido, disponivelCredito, disponivelReal, cardData };
    }, [transactions, investments]);

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
                                    entradas menos saídas, desde o início
                                </p>
                            </div>
                            <Link to="/cartoes" className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <CreditCard className="h-4 w-4" /> Crédito comprometido
                                </div>
                                <p className="mt-3 text-3xl font-bold">{formatBRL(stats.comprometido)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Disponível nos cartões: {formatBRL(stats.disponivelCredito)}</p>
                            </Link>
                            <div className="rounded-xl border border-border bg-card p-5">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <ArrowUpRight className="h-4 w-4 text-positive" /> Entradas no mês
                                </div>
                                <p className="mt-3 text-3xl font-bold text-positive">
                                    {formatBRL(stats.entradasMes)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-5">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <ArrowDownLeft className="h-4 w-4 text-negative" /> Saídas no mês
                                </div>
                                <p className="mt-3 text-3xl font-bold text-negative">
                                    {formatBRL(stats.saidasMes)}
                                </p>
                            </div>
                            <Link
                                to="/investimentos"
                                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/40"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <PiggyBank className="h-4 w-4" /> Carteira
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
