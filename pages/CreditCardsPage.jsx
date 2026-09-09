import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Pencil, Plus, ReceiptText, Trash2, WalletCards, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import Reveal from '@/components/Reveal';
import CreditCardDialog from '@/components/CreditCardDialog';
import CardPurchaseDialog from '@/components/CardPurchaseDialog';
import { Button } from '@/components/ui/button';
import { formatBRL, formatDateBR, invoiceDueDate, installmentInvoiceMonths, monthLabel, todayInput, currentMonthKey, addMonthsToKey } from '@/lib/finance';

const percent = (value,total) => total > 0 ? Math.min(100, Math.max(0, value/total*100)) : 0;
const money = (n) => Number(n || 0);
const currentInvoiceKey = (card) => {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  return now.getDate() > Number(card.closing_day) ? addMonthsToKey(current,1) : current;
};
const monthToDate = (key) => `${key}-01`;

export default function CreditCardsPage(){
  const [cards,setCards]=useState(null); const [purchases,setPurchases]=useState(null); const [invoices,setInvoices]=useState(null); const [cardDialog,setCardDialog]=useState(false); const [purchaseDialog,setPurchaseDialog]=useState(false); const [editing,setEditing]=useState(null); const [selectedCardId,setSelectedCardId]=useState(''); const [selectedInvoice,setSelectedInvoice]=useState(null);
  const load=async()=>{ const [c,p,i]=await Promise.all([pb.collection('credit_cards').getFullList({sort:'name'}),pb.collection('card_purchases').getFullList({sort:'-purchase_date'}),pb.collection('card_invoices').getFullList({sort:'-reference_month'})]); setCards(c);setPurchases(p);setInvoices(i); };
  useEffect(()=>{load().catch(err=>{console.error(err);setCards([]);setPurchases([]);setInvoices([]);toast.error('Não foi possível carregar os cartões.');});},[]);

  const data=useMemo(()=>{
    if(!cards||!purchases||!invoices)return [];
    return cards.map(card=>{
      const cardPurchases=purchases.filter(p=>p.card_id===card.id);
      const installments=[];
      cardPurchases.forEach(p=>{const count=Number(p.installments||1);const each=money(p.amount)/count;installmentInvoiceMonths(p,card.closing_day).forEach((month,index)=>installments.push({purchase:p,month,value:each,index:index+1,count}));});
      const paid=new Set(invoices.filter(i=>i.card_id===card.id&&i.status==='paid').map(i=>i.reference_month));
      const currentKey=currentInvoiceKey(card);
      const currentItems=installments.filter(x=>x.month===currentKey);
      const openItems=installments.filter(x=>!paid.has(x.month));
      const currentTotal=currentItems.reduce((s,x)=>s+x.value,0);
      const committed=openItems.reduce((s,x)=>s+x.value,0);
      const available=Math.max(0,money(card.credit_limit)-committed);
      const invoice=invoices.find(i=>i.card_id===card.id&&i.reference_month===currentKey);
      return {card,cardPurchases,installments,paid,currentKey,currentItems,currentTotal,committed,available,invoice};
    });
  },[cards,purchases,invoices]);

  const saveCard=rec=>setCards(prev=>prev.some(x=>x.id===rec.id)?prev.map(x=>x.id===rec.id?rec:x):[...prev,rec]);
  const savePurchase=()=>load().catch(console.error);
  const removeCard=async(card)=>{if(!window.confirm(`Excluir o cartão ${card.name}? As compras e faturas dele também serão removidas.`))return;try{await pb.collection('credit_cards').delete(card.id);setCards(prev=>prev.filter(x=>x.id!==card.id));setPurchases(prev=>prev.filter(x=>x.card_id!==card.id));setInvoices(prev=>prev.filter(x=>x.card_id!==card.id));toast.success('Cartão excluído.');}catch(e){toast.error('Não foi possível excluir o cartão.');}};
  const payInvoice=async(item)=>{const {card,currentKey,currentTotal,invoice}=item;if(currentTotal<=0)return toast.error('Esta fatura não tem lançamentos.');if(invoice?.status==='paid')return; if(!window.confirm(`Marcar a fatura de ${formatBRL(currentTotal)} do ${card.name} como paga? Isso reduz o saldo da conta e libera o limite.`))return;try{await pb.collection('card_invoices').create({card_id:card.id,reference_month:currentKey,status:'paid',paid_at:todayInput()});await pb.collection('transactions').create({type:'saida',description:`Pagamento fatura ${card.name}`,amount:currentTotal,category:'contas',date:todayInput(),notes:`Fatura ${monthLabel(currentKey)}`,payment_method:'conta'});await load();toast.success('Fatura marcada como paga.');}catch(e){console.error(e);toast.error('Não foi possível pagar a fatura.');}};

  return <div>
    <Reveal><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Crédito</p><h1 className="mt-1 text-4xl font-bold tracking-tight">Seus <span className="font-serif italic font-medium">cartões.</span></h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Veja quanto do limite já está comprometido, acompanhe a fatura e enxergue as parcelas que ainda virão.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>{setSelectedCardId('');setPurchaseDialog(true);}}><Plus className="h-4 w-4"/> Compra no cartão</Button><Button onClick={()=>{setEditing(null);setCardDialog(true);}} className="bg-accent text-accent-foreground hover:bg-accent/85"><Plus className="h-4 w-4"/> Adicionar cartão</Button></div></header></Reveal>

    {cards?.length===0?<Reveal><div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center"><CreditCard className="mx-auto h-10 w-10 text-muted-foreground"/><p className="mt-4 font-serif text-2xl italic">Nenhum cartão ainda.</p><p className="mt-2 text-sm text-muted-foreground">Cadastre seu primeiro cartão para acompanhar limite, fatura e parcelas.</p><Button className="mt-5" onClick={()=>setCardDialog(true)}><Plus className="h-4 w-4"/> Adicionar cartão</Button></div></Reveal>:null}

    <div className="grid gap-5 lg:grid-cols-2">{data.map((item,index)=>{const {card,currentKey,currentTotal,committed,available,invoice,currentItems,installments,paid}=item;const used=money(card.credit_limit)-available;const upcoming=installments.filter(x=>x.month!==currentKey&&!paid.has(x.month)).reduce((s,x)=>s+x.value,0);const due=invoiceDueDate(currentKey,card.due_day);return <Reveal key={card.id} delay={index*.05}>
      <article className="overflow-hidden rounded-xl border border-border bg-card"><div className="bg-primary p-5 text-primary-foreground"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-primary-foreground/60">{card.bank}</p><h2 className="mt-1 text-2xl font-bold">{card.name}</h2></div><div className="rounded-lg bg-primary-foreground/10 p-2"><CreditCard className="h-6 w-6"/></div></div><div className="mt-7 flex items-end justify-between"><div><p className="text-xs text-primary-foreground/60">Fatura atual</p><p className="mt-1 text-3xl font-bold text-accent">{formatBRL(currentTotal)}</p></div><div className="text-right text-xs text-primary-foreground/60"><p>Fecha {card.closing_day}</p><p>Vence {card.due_day}</p></div></div></div>
      <div className="p-5"><div className="flex justify-between text-xs font-semibold"><span>Limite utilizado</span><span>{Math.round(percent(used,Number(card.credit_limit)))}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{width:`${percent(used,Number(card.credit_limit))}%`}}/></div><div className="mt-3 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Limite</p><p className="font-bold">{formatBRL(card.credit_limit)}</p></div><div><p className="text-xs text-muted-foreground">Comprometido</p><p className="font-bold">{formatBRL(committed)}</p></div><div><p className="text-xs text-muted-foreground">Disponível</p><p className="font-bold text-positive">{formatBRL(available)}</p></div></div>
      <div className="mt-5 rounded-lg border border-border p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">{monthLabel(currentKey)}</p><p className="mt-1 text-sm">Vencimento: <strong>{formatDateBR(due)}</strong></p></div>{invoice?.status==='paid'?<span className="flex items-center gap-1 text-xs font-bold text-positive"><CheckCircle2 className="h-4 w-4"/> Paga</span>:<span className="flex items-center gap-1 text-xs font-bold text-negative"><AlertTriangle className="h-4 w-4"/> Em aberto</span>}</div>{currentItems.length>0?<ul className="mt-3 space-y-2">{currentItems.slice(0,5).map((x,i)=><li key={`${x.purchase.id}-${i}`} className="flex justify-between gap-3 text-sm"><span className="truncate">{x.purchase.description}{x.count>1?<span className="ml-1 text-xs text-muted-foreground">({x.index}/{x.count})</span>:null}</span><span className="shrink-0 font-semibold">{formatBRL(x.value)}</span></li>)}</ul>:<p className="mt-3 text-xs text-muted-foreground">Nenhuma compra nesta fatura.</p>}<div className="mt-4 flex gap-2"><Button size="sm" className="flex-1" variant={invoice?.status==='paid'?'outline':'default'} disabled={invoice?.status==='paid'} onClick={()=>payInvoice(item)}>{invoice?.status==='paid'?'Fatura paga':'Marcar como paga'}</Button><Button size="sm" variant="outline" onClick={()=>{setSelectedInvoice(item);}}>Detalhes</Button></div></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Próximas parcelas</p><p className="mt-1 font-bold">{formatBRL(upcoming)}</p></div><div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Compras cadastradas</p><p className="mt-1 font-bold">{item.cardPurchases.length}</p></div></div>
      <div className="mt-4 flex justify-end gap-1"><button className="flex h-9 items-center gap-1 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={()=>{setEditing(card);setCardDialog(true)}}><Pencil className="h-4 w-4"/> Editar</button><button className="flex h-9 items-center gap-1 rounded-md px-3 text-xs text-muted-foreground hover:bg-negative/10 hover:text-negative" onClick={()=>removeCard(card)}><Trash2 className="h-4 w-4"/> Excluir</button><button className="flex h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold hover:bg-accent" onClick={()=>{setSelectedCardId(card.id);setPurchaseDialog(true)}}><Plus className="h-4 w-4"/> Compra</button></div></div></article>
    </Reveal>})}</div>

    {data.length>0?<Reveal delay={.12}><section className="mt-6 rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5"/><div><h2 className="font-serif text-xl italic">Visão do crédito</h2><p className="text-xs text-muted-foreground">Quanto do seu limite total já está comprometido.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Limite total</p><p className="mt-1 text-2xl font-bold">{formatBRL(data.reduce((s,x)=>s+money(x.card.credit_limit),0))}</p></div><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Comprometido</p><p className="mt-1 text-2xl font-bold text-negative">{formatBRL(data.reduce((s,x)=>s+x.committed,0))}</p></div><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Disponível</p><p className="mt-1 text-2xl font-bold text-positive">{formatBRL(data.reduce((s,x)=>s+x.available,0))}</p></div></div></section></Reveal>:null}

    {selectedInvoice?<InvoiceDetails item={selectedInvoice} onClose={()=>setSelectedInvoice(null)}/>:null}
    <CreditCardDialog open={cardDialog} onOpenChange={setCardDialog} card={editing} onSaved={saveCard}/><CardPurchaseDialog open={purchaseDialog} onOpenChange={setPurchaseDialog} cards={cards||[]} cardId={selectedCardId} onSaved={savePurchase}/>
  </div>;
}

function InvoiceDetails({item,onClose}){const {card,currentKey,installments,paid}=item;const months=[...new Set(installments.filter(x=>!paid.has(x.month)).map(x=>x.month))].sort();return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Parcelamento</p><h2 className="mt-1 text-2xl font-bold">{card.name}</h2></div><Button variant="outline" onClick={onClose}>Fechar</Button></div><p className="mt-2 text-sm text-muted-foreground">Fatura atual: {monthLabel(currentKey)}</p>{months.length===0?<p className="mt-8 text-sm text-muted-foreground">Nenhum compromisso futuro.</p>:<div className="mt-6 space-y-4">{months.map(month=>{const items=installments.filter(x=>x.month===month&&!paid.has(month));const total=items.reduce((s,x)=>s+x.value,0);return <div key={month} className="rounded-lg border border-border p-4"><div className="flex justify-between"><strong>{monthLabel(month)}</strong><strong>{formatBRL(total)}</strong></div><ul className="mt-3 space-y-2 text-sm">{items.map((x,i)=><li key={`${x.purchase.id}-${i}`} className="flex justify-between gap-3"><span>{x.purchase.description} <span className="text-xs text-muted-foreground">{x.count>1?`${x.index}/${x.count}`:''}</span></span><span>{formatBRL(x.value)}</span></li>)}</ul></div>})}</div>}</div></div>}
