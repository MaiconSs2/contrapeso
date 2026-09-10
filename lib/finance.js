const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatBRL = (value) => BRL.format(Number.isFinite(value) ? value : 0);

export const INCOME_CATEGORIES = [
    { value: 'salario', label: 'Salário' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'investimentos', label: 'Investimentos' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'outros', label: 'Outros' },
];

export const EXPENSE_CATEGORIES = [
    { value: 'moradia', label: 'Moradia' },
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'saude', label: 'Saúde' },
    { value: 'lazer', label: 'Lazer' },
    { value: 'educacao', label: 'Educação' },
    { value: 'contas', label: 'Contas e serviços' },
    { value: 'assinaturas', label: 'Assinaturas' },
    { value: 'outros', label: 'Outros' },
];

export const CATEGORY_LABELS = Object.fromEntries(
    [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => [c.value, c.label]),
);

export const ASSET_TYPES = [
    { value: 'acao', label: 'Ação' },
    { value: 'fii', label: 'FII' },
    { value: 'etf', label: 'ETF' },
    { value: 'cripto', label: 'Cripto' },
    { value: 'renda_fixa', label: 'Renda fixa' },
    { value: 'outro', label: 'Outro' },
];

export const ASSET_TYPE_LABELS = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t.label]));

export const CHART_COLORS = [
    'hsl(220 70% 35%)',
    'hsl(152 48% 30%)',
    'hsl(8 68% 42%)',
    'hsl(36 62% 44%)',
    'hsl(205 55% 38%)',
    'hsl(330 50% 42%)',
    'hsl(270 45% 42%)',
    'hsl(190 55% 35%)',
];

export const parseDate = (value) => {
    if (!value) return null;
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

export const formatDateBR = (value) => {
    const dt = parseDate(value);
    return dt ? dt.toLocaleDateString('pt-BR') : '—';
};

export const monthKey = (value) => String(value || '').slice(0, 7);

export const monthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        .replace('.', '');
};

export const currentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const todayInput = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const parseAmount = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return NaN;
    if (s.includes('.') && s.includes(',')) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(s.replace(',', '.'));
};

export const formatInputNumber = (value) =>
    String(value ?? '').replace('.', ',');

export const addMonthsToKey = (key, amount) => {
    const [y, m] = String(key).split('-').map(Number);
    const d = new Date(y, m - 1 + amount, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const invoiceMonthForPurchase = (purchaseDate, closingDay) => {
    const [y, m, d] = String(purchaseDate).slice(0, 10).split('-').map(Number);
    const base = new Date(y, m - 1 + (d > Number(closingDay) ? 1 : 0), 1);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
};

export const installmentInvoiceMonths = (purchase, closingDay) => {
    const first = invoiceMonthForPurchase(purchase.purchase_date, closingDay);
    return Array.from({ length: Number(purchase.installments || 1) }, (_, index) => addMonthsToKey(first, index));
};

// Saldo "de verdade": soma entradas e saídas pagas em dinheiro/conta/débito.
// Compras no crédito e gastos em benefícios ficam de fora, porque não saem
// direto do seu caixa (crédito só sai quando a fatura é paga; benefício é
// dinheiro à parte, tipo vale-refeição).
export const sumBalance = (transactions) =>
    (transactions || []).reduce((sum, t) => {
        if (['cartao', 'beneficio'].includes(t.payment_method)) return sum;
        return sum + (t.type === 'entrada' ? 1 : -1) * Number(t.amount || 0);
    }, 0);

export const invoiceDueDate = (referenceMonth, dueDay) => {
    const [y, m] = String(referenceMonth).split('-').map(Number);
    const day = Math.min(Number(dueDay) || 1, new Date(y, m, 0).getDate());
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
