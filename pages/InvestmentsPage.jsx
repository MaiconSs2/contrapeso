import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
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
import Reveal from '@/components/Reveal';
import InvestmentDialog from '@/components/InvestmentDialog';
import { Button } from '@/components/ui/button';
import {
    ASSET_TYPE_LABELS,
    CHART_COLORS,
    formatBRL,
    formatDateBR,
} from '@/lib/finance';
import { cn } from '@/lib/utils';

const enrich = (i) => {
    const current = i.currentPrice > 0 ? i.currentPrice : i.avgPrice;
    const invested = i.quantity * i.avgPrice;
    const currentValue = i.quantity * current;
    const pnl = currentValue - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return { ...i, current, invested, currentValue, pnl, pct };
};

export default function InvestmentsPage() {
    const [investments, setInvestments] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        pb.collection('investments')
            .getFullList({ sort: 'asset' })
            .then(setInvestments)
            .catch((err) => {
                console.error('Falha ao carregar investimentos', err);
                setInvestments([]);
            });
    }, []);

    const rows = useMemo(() => (investments || []).map(enrich), [investments]);

    const summary = useMemo(() => {
        const invested = rows.reduce((s, r) => s + r.invested, 0);
        const current = rows.reduce((s, r) => s + r.currentValue, 0);
        const pnl = current - invested;
        const pct = invested > 0 ? (pnl / invested) * 100 : 0;
        const byType = {};
        rows.forEach((r) => {
            byType[r.assetType] = (byType[r.assetType] || 0) + r.currentValue;
        });
        const allocation = Object.entries(byType).map(([key, value]) => ({
            name: ASSET_TYPE_LABELS[key] || key,
            value,
        }));
        const comparison = rows.map((r) => ({
            name: r.asset,
            investido: Number(r.invested.toFixed(2)),
            atual: Number(r.currentValue.toFixed(2)),
        }));
        return { invested, current, pnl, pct, allocation, comparison };
    }, [rows]);

    const handleSaved = (rec) => {
        setInvestments((prev) => {
            const list = prev || [];
            const exists = list.some((x) => x.id === rec.id);
            const next = exists ? list.map((x) => (x.id === rec.id ? rec : x)) : [...list, rec];
            return next.slice().sort((a, b) => a.asset.localeCompare(b.asset));
        });
    };

    const handleDelete = async (inv) => {
        if (!window.confirm(`Excluir a posição em ${inv.asset}?`)) return;
        try {
            await pb.collection('investments').delete(inv.id);
            setInvestments((prev) => prev.filter((x) => x.id !== inv.id));
            toast.success('Posição excluída.');
        } catch (err) {
            toast.error('Não foi possível excluir.');
        }
    };

    return (
        <div>
<Reveal>
                <header className="relative mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                            Carteira
                        </p>
                        <h1 className="mt-1 text-4xl font-bold tracking-tight">
                            Investimentos{' '}
                            <span className="font-serif italic font-medium">posição a posição</span>
                        </h1>
                    </div>
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setDialogOpen(true);
                        }}
                        className="h-11 bg-accent px-5 font-bold text-accent-foreground hover:bg-accent/85"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Nova posição
                    </Button>
                </header>
            </Reveal>

            {investments === null ? (
                <div className="grid gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                    ))}
                </div>
            ) : investments.length === 0 ? (
                <Reveal delay={0.08}>
                    <div className="rounded-xl border border-border bg-card px-5 py-20 text-center">
                        <p className="font-serif text-2xl italic">Sua carteira está vazia.</p>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                            Adicione sua primeira posição com quantidade, preço médio e data de
                            compra — depois atualize o preço atual para comparar.
                        </p>
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setDialogOpen(true);
                            }}
                            className="mt-6 bg-accent font-bold text-accent-foreground hover:bg-accent/85"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Adicionar posição
                        </Button>
                    </div>
                </Reveal>
            ) : (
                <>
                    <Reveal delay={0.08}>
                        <section className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl border border-border bg-card p-5">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Total investido
                                </p>
                                <p className="mt-2 text-2xl font-bold">{formatBRL(summary.invested)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">custo de aquisição</p>
                            </div>
                            <div className="rounded-xl bg-primary p-5 text-primary-foreground">
                                <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                                    Valor atual
                                </p>
                                <p className="mt-2 text-2xl font-bold text-accent">
                                    {formatBRL(summary.current)}
                                </p>
                                <p className="mt-1 text-xs text-primary-foreground/60">
                                    com os últimos preços informados
                                </p>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-5">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Resultado
                                </p>
                                <p
                                    className={cn(
                                        'mt-2 flex items-center gap-2 text-2xl font-bold',
                                        summary.pnl >= 0 ? 'text-positive' : 'text-negative',
                                    )}
                                >
                                    {summary.pnl >= 0 ? (
                                        <TrendingUp className="h-5 w-5" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5" />
                                    )}
                                    {formatBRL(summary.pnl)}
                                </p>
                                <p
                                    className={cn(
                                        'mt-1 text-xs font-semibold',
                                        summary.pnl >= 0 ? 'text-positive' : 'text-negative',
                                    )}
                                >
                                    {summary.pct >= 0 ? '+' : ''}
                                    {summary.pct.toFixed(2)}% sobre o custo
                                </p>
                            </div>
                        </section>
                    </Reveal>

                    <section className="mt-6 grid gap-4 lg:grid-cols-3">
                        <Reveal delay={0.12} className="lg:col-span-2">
                            <div className="h-full rounded-xl border border-border bg-card p-5">
                                <h2 className="font-serif text-xl italic">Custo × valor atual</h2>
                                <p className="text-xs text-muted-foreground">comparação por ativo</p>
                                <div className="mt-4 h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={summary.comparison} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 16% 85%)" vertical={false} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                fontSize={11}
                                                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                                            />
                                            <Tooltip formatter={(v) => formatBRL(v)} cursor={{ fill: 'hsl(44 24% 89%)' }} />
                                            <Bar dataKey="investido" name="Investido" fill="hsl(30 12% 9%)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="atual" name="Valor atual" fill="hsl(71 93% 55%)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <div className="h-full rounded-xl bg-accent p-5 text-accent-foreground">
                                <h2 className="font-serif text-xl italic">Alocação</h2>
                                <p className="text-xs opacity-70">por tipo de ativo, valor atual</p>
                                <div className="mt-2 h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={summary.allocation}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={44}
                                                outerRadius={72}
                                                strokeWidth={2}
                                                stroke="hsl(71 93% 55%)"
                                            >
                                                {summary.allocation.map((a, i) => (
                                                    <Cell key={a.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => formatBRL(v)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <ul className="mt-2 space-y-1 text-xs font-medium">
                                    {summary.allocation.map((a, i) => (
                                        <li key={a.name} className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5"
                                                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                                                />
                                                {a.name}
                                            </span>
                                            {formatBRL(a.value)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    </section>

                    <Reveal delay={0.16}>
                        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[820px] text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                                            <th className="px-5 py-3 font-semibold">Ativo</th>
                                            <th className="px-3 py-3 font-semibold">Qtd.</th>
                                            <th className="px-3 py-3 font-semibold">Preço médio</th>
                                            <th className="px-3 py-3 font-semibold">Preço atual</th>
                                            <th className="px-3 py-3 font-semibold">Compra</th>
                                            <th className="px-3 py-3 text-right font-semibold">Investido</th>
                                            <th className="px-3 py-3 text-right font-semibold">Atual</th>
                                            <th className="px-3 py-3 text-right font-semibold">Variação</th>
                                            <th className="px-3 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {rows.map((r) => (
                                            <tr key={r.id} className="transition-colors hover:bg-muted/50">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-bold">{r.asset}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ASSET_TYPE_LABELS[r.assetType] || r.assetType}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3.5">{r.quantity}</td>
                                                <td className="px-3 py-3.5">{formatBRL(r.avgPrice)}</td>
                                                <td className="px-3 py-3.5">
                                                    {r.currentPrice > 0 ? formatBRL(r.currentPrice) : '—'}
                                                </td>
                                                <td className="px-3 py-3.5 text-muted-foreground">
                                                    {formatDateBR(r.purchaseDate)}
                                                </td>
                                                <td className="px-3 py-3.5 text-right">{formatBRL(r.invested)}</td>
                                                <td className="px-3 py-3.5 text-right font-semibold">
                                                    {formatBRL(r.currentValue)}
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold',
                                                            r.pct >= 0
                                                                ? 'bg-positive/10 text-positive'
                                                                : 'bg-negative/10 text-negative',
                                                        )}
                                                    >
                                                        {r.pct >= 0 ? (
                                                            <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        {r.pct >= 0 ? '+' : ''}
                                                        {r.pct.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Editar posição"
                                                            onClick={() => {
                                                                setEditing(r);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Excluir posição"
                                                            onClick={() => handleDelete(r)}
                                                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </Reveal>
                </>
            )}

            <InvestmentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                investment={editing}
                onSaved={handleSaved}
            />
        </div>
    );
}
