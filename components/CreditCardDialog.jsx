import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseAmount } from '@/lib/finance';

// Só cartão de crédito e "benefícios" (vale-alimentação, vale-refeição etc.)
// são cadastrados aqui — eles têm um limite ou saldo próprio, separado do seu
// dinheiro de verdade. Débito não entra: ele é só uma forma de pagamento que
// usa o seu saldo atual (veja a tela de Transações).
const labels = { credito: 'Crédito', alimentacao: 'Alimentação', refeicao: 'Refeição', beneficio: 'Benefício' };

export default function CreditCardDialog({ open, onOpenChange, card, onSaved }) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [kind, setKind] = useState('credito');
  const [limit, setLimit] = useState('');
  const [closing, setClosing] = useState('10');
  const [due, setDue] = useState('17');
  const [initial, setInitial] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(card?.name || '');
      setBank(card?.bank || '');
      // Cartões antigos de débito continuam editáveis, mas não são mais uma opção nova.
      setKind(card?.card_type && card.card_type !== 'debito' ? card.card_type : 'credito');
      setLimit(String(card?.credit_limit ?? '').replace('.', ','));
      setClosing(String(card?.closing_day ?? 10));
      setDue(String(card?.due_day ?? 17));
      setInitial(String(card?.initial_balance ?? '').replace('.', ','));
    }
  }, [open, card]);

  const credit = kind === 'credito';

  const submit = async (e) => {
    e.preventDefault();
    const n = parseAmount(limit);
    const b = parseAmount(initial);
    if (!name.trim() || !bank.trim() || (credit ? !Number.isFinite(n) : !Number.isFinite(b))) {
      return toast.error('Preencha os dados corretamente.');
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        bank: bank.trim(),
        card_type: kind,
        credit_limit: credit ? n : 0,
        closing_day: credit ? Number(closing) : null,
        due_day: credit ? Number(due) : null,
        initial_balance: credit ? 0 : b,
        account_id: null,
      };
      const rec = card
        ? await pb.collection('credit_cards').update(card.id, payload)
        : await pb.collection('credit_cards').create(payload);
      onSaved(rec);
      onOpenChange(false);
      toast.success(card ? 'Cartão atualizado.' : 'Cartão adicionado.');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Não foi possível salvar o cartão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? 'Editar cartão' : 'Adicionar cartão'}</DialogTitle>
          <DialogDescription>
            Cadastre crédito ou um benefício (alimentação, refeição). Para débito, use a forma de
            pagamento "Cartão de débito" direto ao lançar uma transação — ele já usa seu saldo atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Nubank" required /></div>
            <div><Label>Banco / emissor</Label><Input value={bank} onChange={e => setBank(e.target.value)} placeholder="Ex.: Nubank" required /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(labels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {credit ? (
            <>
              <div><Label>Limite</Label><Input inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} placeholder="1.000,00" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fechamento</Label><Input type="number" min="1" max="31" value={closing} onChange={e => setClosing(e.target.value)} required /></div>
                <div><Label>Vencimento</Label><Input type="number" min="1" max="31" value={due} onChange={e => setDue(e.target.value)} required /></div>
              </div>
            </>
          ) : (
            <div>
              <Label>Saldo inicial do benefício</Label>
              <Input inputMode="decimal" value={initial} onChange={e => setInitial(e.target.value)} placeholder="500,00" required />
              <p className="mt-1 text-xs text-muted-foreground">Quanto esse vale já tem hoje. Cada gasto vai descontando daqui.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar cartão'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
