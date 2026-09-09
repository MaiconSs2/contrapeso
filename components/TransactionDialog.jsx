import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, parseAmount, todayInput } from '@/lib/finance';

const typeLabel = { credito: 'Cartão de crédito', debito: 'Cartão de débito', alimentacao: 'Alimentação', refeicao: 'Refeição', beneficio: 'Benefício' };

export default function TransactionDialog({ open, onOpenChange, transaction, onSaved }) {
  const [type, setType] = useState('entrada');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('conta');
  const [cardId, setCardId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      pb.collection('credit_cards').getFullList({ sort: 'name' }),
      pb.collection('accounts').getFullList({ sort: 'name' }),
    ]).then(([c, a]) => { setCards(c); setAccounts(a); }).catch(() => {});

    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description || '');
      setAmount(String(transaction.amount ?? '').replace('.', ','));
      setCategory(transaction.category || 'outros');
      setDate(transaction.date || todayInput());
      setNotes(transaction.notes || '');
      setPaymentMethod(transaction.payment_method || 'conta');
      setCardId(transaction.card_id || '');
      setAccountId(transaction.account_id || '');
      setInstallments(String(transaction.installments || 1));
    } else {
      setType('entrada'); setDescription(''); setAmount(''); setCategory('outros'); setDate(todayInput());
      setNotes(''); setPaymentMethod('conta'); setCardId(''); setAccountId(''); setInstallments('1');
    }
  }, [open, transaction]);

  const selectedCard = cards.find(c => c.id === cardId);
  const cardKind = selectedCard?.card_type;
  const benefits = cards.filter(c => ['alimentacao', 'refeicao', 'beneficio'].includes(c.card_type));
  const installmentCount = Math.max(1, Number(installments) || 1);
  const numericAmount = parseAmount(amount);
  const installmentValue = useMemo(() => Number.isFinite(numericAmount) ? numericAmount / installmentCount : 0, [numericAmount, installmentCount]);

  const submit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return toast.error('Informe descrição e um valor válido.');
    if (type === 'saida' && paymentMethod === 'cartao' && !cardId) return toast.error('Selecione o cartão de crédito.');
    if (type === 'saida' && paymentMethod === 'debito' && !cardId) return toast.error('Selecione o cartão de débito.');
    if (type === 'saida' && paymentMethod === 'beneficio' && !cardId) return toast.error('Selecione o cartão de benefício.');
    if (type === 'saida' && paymentMethod === 'conta' && !accountId && accounts.length) return toast.error('Selecione a conta.');
    if (paymentMethod === 'cartao' && selectedCard?.card_type !== 'credito') return toast.error('Selecione um cartão de crédito.');
    if (paymentMethod === 'cartao' && (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 60)) return toast.error('As parcelas devem estar entre 1 e 60.');

    setSaving(true);
    let purchase = null;
    try {
      if (transaction?.payment_method === 'cartao' || transaction?.payment_method === 'beneficio') {
        return toast.error('Para editar uma compra de cartão, use a área Cartões.');
      }

      if (type === 'saida' && paymentMethod === 'cartao') {
        purchase = await pb.collection('card_purchases').create({
          card_id: cardId,
          description: description.trim(),
          amount: numericAmount,
          category,
          purchase_date: date,
          installments: installmentCount,
          notes: notes.trim(),
        });
      }
      if (type === 'saida' && paymentMethod === 'beneficio') {
        purchase = await pb.collection('card_purchases').create({
          card_id: cardId,
          description: description.trim(),
          amount: numericAmount,
          category,
          purchase_date: date,
          installments: 1,
          notes: notes.trim(),
        });
      }

      const payload = {
        type,
        description: description.trim(),
        amount: numericAmount,
        category,
        date,
        notes: notes.trim(),
        payment_method: paymentMethod,
        card_id: ['cartao', 'debito', 'beneficio'].includes(paymentMethod) ? cardId : null,
        card_purchase_id: purchase?.id || null,
        account_id: (paymentMethod === 'conta' || paymentMethod === 'debito') ? accountId || selectedCard?.account_id || null : null,
      };

      const rec = await pb.collection('transactions').create(payload);
      onSaved(rec);
      onOpenChange(false);
      toast.success(paymentMethod === 'cartao'
        ? (installmentCount > 1 ? `Compra registrada em ${installmentCount}x.` : 'Compra registrada no crédito.')
        : paymentMethod === 'beneficio' ? 'Gasto registrado no benefício.' : 'Transação adicionada.');
    } catch (err) {
      console.error(err);
      if (purchase) try { await pb.collection('card_purchases').delete(purchase.id); } catch {}
      toast.error(err?.message || 'Não foi possível salvar a transação.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          <DialogDescription>Registre entradas e saídas sem perder a origem do dinheiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Tipo</Label><Select value={type} onValueChange={v => { setType(v); setCategory('outros'); if (v === 'entrada') setPaymentMethod('conta'); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Mercado" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Valor total</Label><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" required /></div>
            <div className="space-y-2"><Label>Categoria</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(type === 'entrada' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
          </div>

          {type === 'saida' && <div className="space-y-2"><Label>Forma de pagamento</Label><Select value={paymentMethod} onValueChange={v => { setPaymentMethod(v); setCardId(''); setInstallments('1'); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="conta">Conta / dinheiro</SelectItem><SelectItem value="cartao">Cartão de crédito</SelectItem><SelectItem value="debito">Cartão de débito</SelectItem><SelectItem value="beneficio">Alimentação / refeição / benefício</SelectItem></SelectContent></Select></div>}

          {type === 'saida' && paymentMethod === 'conta' && accounts.length > 0 && <div className="space-y-2"><Label>Conta</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>}

          {type === 'saida' && (paymentMethod === 'cartao' || paymentMethod === 'debito') && <div className="space-y-2"><Label>{paymentMethod === 'cartao' ? 'Cartão de crédito' : 'Cartão de débito'}</Label><Select value={cardId} onValueChange={setCardId}><SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger><SelectContent>{cards.filter(c => c.card_type === (paymentMethod === 'cartao' ? 'credito' : 'debito')).map(c => <SelectItem key={c.id} value={c.id}>{c.name} · {c.bank}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{paymentMethod === 'debito' ? 'O gasto sai da conta vinculada ao cartão e aparece no total gasto nesse débito.' : 'A compra compromete o limite e só reduz o caixa quando a fatura for paga.'}</p></div>}

          {type === 'saida' && paymentMethod === 'cartao' && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Parcelas</Label><Input type="number" min="1" max="60" value={installments} onChange={e => setInstallments(e.target.value)} required /></div>
            <div className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">Cada parcela</p><p className="mt-1 font-bold">{Number.isFinite(numericAmount) ? installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p></div>
          </div>}

          {type === 'saida' && paymentMethod === 'beneficio' && <div className="space-y-2"><Label>Cartão de benefício</Label><Select value={cardId} onValueChange={setCardId}><SelectTrigger><SelectValue placeholder="Selecione o benefício" /></SelectTrigger><SelectContent>{benefits.map(c => <SelectItem key={c.id} value={c.id}>{c.name} · {typeLabel[c.card_type]}</SelectItem>)}</SelectContent></Select></div>}
          {type === 'saida' && paymentMethod === 'cartao' && selectedCard && <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm"><strong>{installmentCount}x</strong> de <strong>{Number.isFinite(numericAmount) ? installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</strong>. O total de {Number.isFinite(numericAmount) ? numericAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'} compromete o limite, e as parcelas aparecem nas faturas correspondentes.</div>}

          <div className="space-y-2"><Label>Observação (opcional)</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
