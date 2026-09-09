# Contrapeso

Aplicação pessoal de finanças com React + Vite + Supabase.

## O que há nesta versão

- Dashboard financeiro
- Entradas e saídas
- Investimentos
- Cartões de crédito
- Limite utilizado e disponível
- Fatura atual por cartão
- Compras à vista e parceladas
- Compromissos das próximas faturas
- Marcação de fatura como paga, gerando a saída correspondente no caixa
- Visão de “disponível real”: saldo em conta menos faturas abertas
- RLS no Supabase para separar os dados por usuário

## Supabase

No SQL Editor do seu projeto Supabase, execute **todo** o arquivo `supabase/schema.sql`.

Se você já usava a versão anterior do Contrapeso, o script contém `alter table ... add column if not exists` para atualizar a tabela `transactions` e cria as novas tabelas de cartões.

Na Vercel, use:

```text
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca coloque uma chave `sb_secret_...` em variável `VITE_` ou no código do navegador.

## Cartões

Cadastre o cartão com:

- nome
- banco
- limite
- dia de fechamento
- dia de vencimento

Uma compra feita depois do fechamento entra na fatura do mês seguinte. Parcelamentos são distribuídos pelas faturas seguintes.

Quando uma fatura é marcada como paga, o Contrapeso cria uma saída no caixa com a data do pagamento e libera o limite correspondente.

## Vercel

O `vercel.json` contém a regra de SPA para que `/login`, `/cadastro`, `/transacoes`, `/investimentos` e `/cartoes` funcionem ao recarregar a página.

## Atualização contas e cartões
Execute `supabase/schema.sql` no SQL Editor do Supabase antes de publicar esta versão. A migração é compatível com as tabelas existentes e adiciona contas, débito e benefícios.
