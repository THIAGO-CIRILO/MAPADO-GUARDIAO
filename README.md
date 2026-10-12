# Mapa do Guardião — site de verdade (celular e computador)

**Como funciona:** a cliente entra, faz o cadastro, responde passo a passo e recebe o mapa. Tudo fica salvo; você vê tudo em `/admin`.
A chave do Claude fica **só no servidor** (Vercel). Nunca coloque ela em arquivo do site.

Peças: **Supabase** (login + banco de dados), **Vercel** (site + função que chama o Claude), **Anthropic Console** (chave da IA).

## 1) Supabase (grátis para começar)
1. Crie conta em supabase.com → *New project*.
2. Menu **SQL Editor** → cole todo o conteúdo de `supabase/schema.sql` → *Run*.
3. **Authentication → Providers → Email**: ligado. Deixe "Confirm email" ligado (recomendado).
4. **Authentication → URL Configuration**: em *Site URL* coloque o endereço final do site (ex.: https://mapa.seudominio.com.br).
5. **Project Settings → API**: copie *Project URL*, a chave *anon public* e a chave *service_role* (esta é secreta).
6. Abra `public/config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## 2) Chave do Claude (pagamento da IA)
O Claude **da API é cobrado à parte** da assinatura do Claude.ai.
1. Entre em console.anthropic.com (mesmo e-mail serve, mas é outro painel).
2. **Billing**: adicione cartão e crédito (ex.: US$ 20). Defina um **limite mensal de gasto**.
3. **API Keys → Create Key**. Copie (`sk-ant-...`). Ela só aparece uma vez.
4. Cada mapa faz 2 chamadas; custa centavos a poucos reais por mapa. Acompanhe em *Usage*.

## 3) Vercel
1. Suba esta pasta para um repositório no GitHub (ou use `npx vercel` nesta pasta).
2. vercel.com → *Add New Project* → importe o repositório.
3. **Settings → Environment Variables**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = chave anon
   - `SUPABASE_SERVICE_ROLE_KEY` = chave service_role
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-...`
   - opcionais: `ANTHROPIC_MODEL` (padrão `claude-sonnet-5-5`), `ADMIN_EMAIL` (padrão contato.energystudio@gmail.com), `MAX_MAPAS` (mapas por pessoa a cada 24h; padrão 3)
4. *Deploy*. Depois, em **Domains**, ligue o seu domínio.
5. Sempre que mudar variável, faça *Redeploy*.

## 4) Primeiro acesso (você, administrador)
1. Abra o site, clique em criar conta usando **contato.energystudio@gmail.com** e confirme o e-mail.
2. Entre em `seusite.com.br/admin` com esse e-mail: lista de todas as cadastradas, filtro, exportar CSV e botão **Abrir mapa** de cada leitura.
3. Só esse e-mail enxerga o admin (regra aplicada no banco, não só na tela). Você não tem limite de mapas.

## Instalar como app no celular
Abrir o site no navegador → menu → *Adicionar à tela inicial*.

## Atenções
- **Tempo:** a função tem limite de 60 s (o plano gratuito da Vercel pode limitar a menos). Por isso o mapa é gerado em duas chamadas paralelas. Se der tempo esgotado, use plano Pro ou reduza `max_tokens` em `api/_prompt.js`/`gerar.js`.
- **LGPD:** a cliente marca a concordância antes de gerar. Inclua política de privacidade no site e avise que dados de nascimento ficam guardados.
- **Texto do mapa:** o prompt trata ferida/guardião como hipótese, sem diagnóstico, sem causa de origem. Mantenha isso na comunicação comercial.
- **Não testado de verdade aqui:** o fluxo foi testado ponta a ponta com Supabase e Claude simulados. Faça 1 mapa real depois do deploy para conferir a chave, o schema e a confirmação por e-mail.
- **Cobrar das clientes (Hotmart, Stripe, Pix):** ainda não incluído. Dá para ligar depois (pagamento libera o acesso).
