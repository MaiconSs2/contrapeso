import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES, formatBRL, invoiceMonthForPurchase, parseAmount, todayInput, addMonthsToKey } from '@/lib/finance';

export default function CardPurchaseDialog({ open, onOpenChange, cards, cardId, purchase, onSaved }) {
  const [selectedCard, setSelectedCard] = useState(cardId || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [valueMode, setValueMode] = useState('total');
  const [category, setCategory] = useState('outros');
  const [date, setDate] = useState(todayInput());
  const [installments, setInstallments] = useState('1');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedCard(purchase?.card_id || cardId || cards?.[0]?.id || '');
      setDescription(purchase?.description || '');
      setAmount(purchase ? String(purchase.amount ?? '').replace('.', ',') : '');
      setValueMode('total');
      setCategory(purchase?.category || 'outros');
      setDate(purchase?.purchase_date || todayInput());
      setInstallments(String(purchase?.installments || 1));
      setPaidInstallments(String(purchase?.paid_installments || 0));
      setNotes(purchase?.notes || '');
    }
  }, [open, cardId, cards, purchase]);

  const card = cards.find((c) => c.id === selectedCard);
  const rawValue = parseAmount(amount);
  const count = Math.max(1, Number(installments) || 1);
  const paidCount = Math.min(count, Math.max(0, Number(paidInstallments) || 0));
  const remainingCount = Math.max(0, count - paidCount);

  const totalValue = useMemo(() => {
    if (!Number.isFinite(rawValue)) return 0;
    return valueMode === 'parcela' ? rawValue * count : rawValue;
  }, [rawValue, valueMode, count]);

  const installmentValue = useMemo(() => {
    if (!Number.isFinite(rawValue)) return 0;
    return valueMode === 'parcela' ? rawValue : rawValue / count;
  }, [rawValue, valueMode, count]);

  const firstInvoice = card && date ? invoiceMonthForPurchase(date, card.closing_day) : '';
  const firstRemainingInvoice = firstInvoice && paidCount > 0 ? addMonthsToKey(firstInvoice, paidCount) : firstInvoice;

  const submit = async (e) => {
    e.preventDefault();

    if (card?.card_type && card.card_type !== 'credito') {
      return toast.error('Parcelamento é exclusivo para cartão de crédito.');
    }

    if (
      !selectedCard ||
      !description.trim() ||
      !Number.isFinite(totalValue) ||
      totalValue <= 0 ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 60 ||
      !Number.isInteger(paidCount) ||
      paidCount < 0 ||
      paidCount > count ||
      paidCount === count
    ) {
      return toast.error('Preencha os dados da compra corretamente.');
    }

    setSaving(true);

    try {
      const payload = {
        card_id: selectedCard,
        description: description.trim(),
        amount: Number(totalValue.toFixed(2)),
        category,
        purchase_date: date,
        installments: count,
        paid_installments: paidCount,
        notes: notes.trim(),
      };
      const rec = purchase
        ? await pb.collection('card_purchases').update(purchase.id, payload)
        : await pb.collection('card_purchases').create(payload);

      onSaved(rec);
      onOpenChange(false);
      toast.success(purchase ? 'Compra atualizada.' : (count > 1 ? `Compra registrada em ${count}x.` : 'Compra adicionada à fatura.'));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Não foi possível salvar a compra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{purchase ? 'Editar compra no cartão' : 'Nova compra no cartão'}</DialogTitle>
          <DialogDescription>
            Registre uma compra atual ou uma compra antiga para manter o histórico e as parcelas sob controle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label>Cartão</Label>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} · {c.bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Notebook" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{valueMode === 'parcela' ? 'Valor da parcela' : 'Valor da compra'}</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Como você quer informar o valor?</Label>
            <Select value={valueMode} onValueChange={setValueMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Valor total da compra</SelectItem>
                <SelectItem value="parcela">Valor de cada parcela</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {valueMode === 'parcela'
                ? 'Útil para cadastrar uma compra antiga: informe quanto é cada parcela e em quantas vezes foi feita.'
                : 'O sistema divide o valor total pelo número de parcelas.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data da compra</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                required
              />
            </div>
          </div>

          {count > 1 && (
            <div className="space-y-2">
              <Label>Parcelas já pagas</Label>
              <Input
                type="number"
                min="0"
                max={count - 1}
                value={paidInstallments}
                onChange={(e) => setPaidInstallments(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se esta é uma compra antiga, informe quantas parcelas já foram pagas. O Contrapeso lançará somente as restantes.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-3 text-sm">
            {card ? (
              <>
                <p>1ª fatura: <strong>{firstRemainingInvoice}</strong></p>
                <p className="mt-1">Restantes: <strong>{remainingCount}</strong> parcela(s)</p>
                <p className="mt-1">Total registrado: <strong>{formatBRL(totalValue)}</strong></p>
                <p className="mt-1">Cada parcela: <strong>{formatBRL(installmentValue)}</strong></p>
              </>
            ) : (
              <p>Selecione um cartão.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: compra feita antes de começar a usar o Contrapeso" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || cards.length === 0}>
              {saving ? 'Salvando…' : purchase ? 'Salvar alterações' : 'Adicionar compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
