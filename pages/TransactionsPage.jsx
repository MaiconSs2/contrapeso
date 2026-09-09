import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import Reveal from '@/components/Reveal';
import TransactionDialog from '@/components/TransactionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CATEGORY_LABELS,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    formatBRL,
    formatDateBR,
    monthKey,
} from '@/lib/finance';

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('');

    useEffect(() => {
        pb.collection('transactions')
            .getFullList({ sort: '-date' })
            .then(setTransactions)
            .catch((err) => {
                console.error('Falha ao carregar transações', err);
                setTransactions([]);
            });
    }, []);

    const filtered = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter((t) => {
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
            if (monthFilter && monthKey(t.date) !== monthFilter) return false;
            if (query && !t.description.toLowerCase().includes(query.toLowerCase())) return false;
            return true;
        });
    }, [transactions, typeFilter, categoryFilter, monthFilter, query]);

    const totals = useMemo(
        () =>
            filtered.reduce(
                (acc, t) => {
                    acc[t.type === 'entrada' ? 'entradas' : 'saidas'] += t.amount;
                    return acc;
                },
                { entradas: 0, saidas: 0 },
            ),
        [filtered],
    );

    const handleSaved = (rec) => {
        setTransactions((prev) => {
            const list = prev || [];
            const exists = list.some((x) => x.id === rec.id);
            const next = exists ? list.map((x) => (x.id === rec.id ? rec : x)) : [rec, ...list];
            return next.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
        });
    };

    const handleDelete = async (t) => {
        if (!window.confirm(`Excluir "${t.description}"?`)) return;
        try {
            await pb.collection('transactions').delete(t.id);
            setTransactions((prev) => prev.filter((x) => x.id !== t.id));
            toast.success('Transação excluída.');
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
                            Fluxo de caixa
                        </p>
                        <h1 className="mt-1 text-4xl font-bold tracking-tight">
                            Transações <span className="font-serif italic font-medium">do mês a mês</span>
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
                        Nova transação
                    </Button>
                </header>
            </Reveal>

            <Reveal delay={0.08}>
                <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar descrição…"
                            className="pl-9"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Entradas e saídas</SelectItem>
                            <SelectItem value="entrada">Só entradas</SelectItem>
                            <SelectItem value="saida">Só saídas</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {ALL_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        aria-label="Filtrar por mês"
                    />
                </div>
            </Reveal>

            <Reveal delay={0.12}>
                <div className="mt-4 flex flex-wrap gap-6 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
                    <p className="text-sm">
                        <span className="text-primary-foreground/60">Entradas: </span>
                        <span className="font-bold text-accent">{formatBRL(totals.entradas)}</span>
                    </p>
                    <p className="text-sm">
                        <span className="text-primary-foreground/60">Saídas: </span>
                        <span className="font-bold">{formatBRL(totals.saidas)}</span>
                    </p>
                    <p className="text-sm">
                        <span className="text-primary-foreground/60">Resultado: </span>
                        <span className="font-bold">{formatBRL(totals.entradas - totals.saidas)}</span>
                    </p>
                </div>
            </Reveal>

            <Reveal delay={0.16}>
                <section className="mt-4 rounded-xl border border-border bg-card">
                    {transactions === null ? (
                        <div className="space-y-3 p-5">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <p className="font-serif text-2xl italic">Nada por aqui.</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {transactions.length === 0
                                    ? 'Lance sua primeira entrada ou saída para começar.'
                                    : 'Nenhuma transação corresponde aos filtros.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {filtered.map((t) => (
                                <li key={t.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                                    <span
                                        className={
                                            t.type === 'entrada'
                                                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-positive/10 text-positive'
                                                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-negative/10 text-negative'
                                        }
                                    >
                                        {t.type === 'entrada' ? (
                                            <ArrowUpRight className="h-4 w-4" />
                                        ) : (
                                            <ArrowDownLeft className="h-4 w-4" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{t.description}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {CATEGORY_LABELS[t.category] || t.category} · {formatDateBR(t.date)}
                                            {t.notes ? ` · ${t.notes}` : ''}
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
                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            aria-label="Editar transação"
                                            onClick={() => {
                                                setEditing(t);
                                                setDialogOpen(true);
                                            }}
                                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Excluir transação"
                                            onClick={() => handleDelete(t)}
                                            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-negative/10 hover:text-negative"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </Reveal>

            <TransactionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                transaction={editing}
                onSaved={handleSaved}
            />
        </div>
    );
}
