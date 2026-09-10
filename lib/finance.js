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

// O mês da fatura é o mês do vencimento, não o mês da compra.
// Ex.: fechamento em 30/08 e vencimento em 10/09:
// uma compra em 01/08 entra na fatura de setembro; uma compra em 31/08
// (após o fechamento) entra na fatura de outubro. Para uma compra em 01/09,
// a primeira fatura também é outubro, pois a fatura de setembro já fechou.
export const invoiceMonthForPurchase = (purchaseDate, closingDay) => {
    const [y, m, d] = String(purchaseDate).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '';

    const safeClosingDay = Math.max(1, Number(closingDay) || 1);
    const daysInPurchaseMonth = new Date(y, m, 0).getDate();
    const effectiveClosingDay = Math.min(safeClosingDay, daysInPurchaseMonth);

    // Até o fechamento: vence no mês seguinte. Depois do fechamento:
    // vai para o próximo ciclo e vence dois meses depois da compra.
    return addMonthsToKey(`${y}-${String(m).padStart(2, '0')}`, d > effectiveClosingDay ? 2 : 1);
};

export const installmentAmounts = (total, installments) => {
    const count = Math.max(1, Number(installments) || 1);
    const cents = Math.round(Number(total || 0) * 100);
    const base = Math.floor(cents / count);
    const remainder = cents - base * count;
    return Array.from({ length: count }, (_, index) =>
        (base + (index === count - 1 ? remainder : 0)) / 100,
    );
};

export const installmentInvoiceMonths = (purchase, closingDay) => {
    const first = invoiceMonthForPurchase(purchase.purchase_date, closingDay);
    return Array.from({ length: Number(purchase.installments || 1) }, (_, index) => addMonthsToKey(first, index));
};

export const remainingInstallmentInvoiceMonths = (purchase, closingDay) => {
    const all = installmentInvoiceMonths(purchase, closingDay);
    const paid = Math.min(
        Math.max(0, Number(purchase.paid_installments || 0)),
        all.length,
    );
    return all.slice(paid);
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
