# Store Audit Trainer — Documento de Engenharia

> **Documento:** Engenharia Técnica do App  
> **Idioma da documentação:** Português  
> **Idioma do aplicativo:** Inglês  
> **Idioma dos relatórios:** Inglês  
> **Tipo de app:** PWA mobile-first  
> **Stack:** Next.js + TypeScript + Tailwind CSS + Supabase + OpenAI API  
> **Objetivo:** orientar agentes de IA/desenvolvedores na construção técnica do app final.

---

## 1. Objetivo deste Documento

Este documento transforma a **Bíblia do App** em uma especificação técnica de engenharia.

Ele deve orientar a implementação real do app **Store Audit Trainer**, cobrindo:

- arquitetura do projeto;
- estrutura de pastas;
- banco de dados;
- autenticação;
- permissões;
- fluxo de auditoria;
- upload de fotos;
- cálculo de score;
- geração de relatórios;
- integração com IA;
- exportação em PDF;
- configuração PWA;
- ordem de implementação.

Este documento deve ser usado por agentes de IA como Codex, Copilot, Claude, Cursor ou qualquer desenvolvedor que vá construir o app.

---

## 2. Escopo Técnico da Primeira Versão Final

A primeira versão final deve incluir:

```txt
Login
Admin role
Auditor role
Dashboard
New audit
Checklist
Scoring engine
Comments
Photo upload
Audit review
Final report
AI action plan
Admin audit view
PDF export
PWA installation
Supabase Row Level Security
```

Itens que não entram na primeira versão:

```txt
Offline sync
Advanced charts
AI image analysis
Push notifications
Manager role funcional
Checklist editor completo
Multi-language support
Native mobile app
```

A estrutura do banco pode permitir esses recursos no futuro, mas eles não devem ser implementados agora.

---

## 3. Stack Técnica Oficial

```txt
Next.js
TypeScript
Tailwind CSS
Supabase Auth
Supabase PostgreSQL
Supabase Storage
OpenAI API
PWA
PDF Export
```

### 3.1 Next.js

Usar **Next.js com App Router**.

Motivos:

- permite frontend e backend no mesmo projeto;
- facilita API routes para OpenAI;
- permite controle de autenticação;
- funciona bem com PWA;
- escalável para dashboards e relatórios.

### 3.2 TypeScript

Todo código deve ser em TypeScript.

Não usar JavaScript puro em arquivos principais.

### 3.3 Tailwind CSS

Usar Tailwind para toda a UI.

Não usar bibliotecas pesadas de UI no início.

### 3.4 Supabase

Supabase será usado para:

- autenticação;
- banco de dados;
- storage de fotos;
- Row Level Security;
- políticas de acesso.

### 3.5 OpenAI API

A IA deve ser chamada apenas pelo backend.

Nunca expor a chave da OpenAI no frontend.

---

## 4. Arquitetura Geral

```txt
User Browser / PWA
        ↓
Next.js Frontend
        ↓
Next.js Server Actions / API Routes
        ↓
Supabase Auth + Database + Storage
        ↓
OpenAI API for AI Reports
```

### 4.1 Frontend

Responsável por:

- telas;
- formulários;
- checklist;
- upload de fotos;
- visualização de relatórios;
- dashboards;
- experiência mobile.

### 4.2 Backend/API Routes

Responsável por:

- chamadas à OpenAI;
- geração segura de AI report;
- lógica sensível;
- validações extras;
- criação de PDF, se feita server-side.

### 4.3 Supabase

Responsável por:

- autenticação;
- roles;
- dados;
- fotos;
- permissões via RLS.

---

## 5. Estrutura de Pastas Recomendada

```txt
store-audit-trainer/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── audits/
│   │   │   └── page.tsx
│   │   ├── stores/
│   │   │   └── page.tsx
│   │   └── users/
│   │       └── page.tsx
│   ├── audits/
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── checklist/
│   │       │   └── page.tsx
│   │       ├── review/
│   │       │   └── page.tsx
│   │       ├── report/
│   │       │   └── page.tsx
│   │       └── action-plan/
│   │           └── page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   └── generate-report/
│   │   │       └── route.ts
│   │   └── pdf/
│   │       └── generate/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── audit/
│   ├── checklist/
│   ├── report/
│   ├── admin/
│   └── ui/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── scoring/
│   │   └── calculateScore.ts
│   ├── ai/
│   │   ├── buildAuditPrompt.ts
│   │   └── parseAiReport.ts
│   ├── pdf/
│   │   └── generatePdf.ts
│   └── utils.ts
│
├── types/
│   ├── database.ts
│   ├── audit.ts
│   ├── user.ts
│   └── report.ts
│
├── data/
│   └── defaultChecklist.ts
│
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── service-worker.js
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── policies.sql
│
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## 6. Variáveis de Ambiente

Criar arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6.1 Regras de Segurança

```txt
NEXT_PUBLIC_SUPABASE_URL pode ser público.
NEXT_PUBLIC_SUPABASE_ANON_KEY pode ser público.
SUPABASE_SERVICE_ROLE_KEY nunca deve ir para o frontend.
OPENAI_API_KEY nunca deve ir para o frontend.
```

Nunca chamar OpenAI diretamente do browser.

---

## 7. Modelo de Dados

### 7.1 profiles

Tabela para complementar usuários do Supabase Auth.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'auditor', 'manager')),
  store_id uuid null references stores(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.2 stores

```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  area text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.3 audits

```sql
create table audits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  auditor_id uuid not null references profiles(id),
  manager_name text,
  visit_date date not null,
  visit_time time not null,
  shift text not null check (shift in ('Morning', 'Afternoon', 'Evening')),
  traffic_level text not null check (traffic_level in ('Low', 'Medium', 'High')),
  visit_type text not null check (visit_type in ('Training Audit', 'Follow-up Audit', 'Mystery Shop Simulation')),
  status text not null default 'Draft',
  total_score numeric default 0,
  max_score numeric default 0,
  percentage numeric default 0,
  final_rating text,
  initial_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);
```

Status permitidos:

```txt
Draft
In Progress
Ready for Review
Completed
AI Report Generated
Action Plan Open
Action Plan Completed
```

### 7.4 audit_questions

```sql
create table audit_questions (
  id uuid primary key default gen_random_uuid(),
  section_name text not null,
  question_text text not null,
  question_description text,
  max_score numeric not null default 5,
  is_required boolean default true,
  is_critical boolean default false,
  is_active boolean default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.5 audit_answers

```sql
create table audit_answers (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  question_id uuid references audit_questions(id),
  section_name text not null,
  question_text_snapshot text not null,
  score numeric,
  max_score numeric not null default 5,
  is_na boolean default false,
  comment text,
  is_critical_issue boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.6 audit_photos

```sql
create table audit_photos (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  answer_id uuid references audit_answers(id) on delete cascade,
  section_name text not null,
  photo_url text not null,
  caption text,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz default now()
);
```

### 7.7 ai_reports

```sql
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  executive_summary text,
  what_went_well text,
  what_needs_improvement text,
  priority_focus text,
  coaching_notes text,
  team_message text,
  follow_up_recommendations text,
  raw_ai_response jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.8 action_plans

```sql
create table action_plans (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  focus_area text,
  summary text,
  generated_by_ai boolean default true,
  status text not null default 'Open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.9 action_plan_items

```sql
create table action_plan_items (
  id uuid primary key default gen_random_uuid(),
  action_plan_id uuid not null references action_plans(id) on delete cascade,
  action text not null,
  owner text,
  priority text check (priority in ('Low', 'Medium', 'High', 'Critical')),
  due_date text,
  success_measure text,
  status text not null default 'Open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 8. Supabase Storage

Criar bucket:

```txt
audit-photos
```

### 8.1 Regras

- Usuário autenticado pode fazer upload.
- Auditor só pode acessar fotos das próprias auditorias.
- Admin pode acessar todas as fotos.
- Fotos devem ser vinculadas a `audit_photos`.

### 8.2 Estrutura de Caminho

```txt
audit-photos/{audit_id}/{answer_id}/{timestamp}-{filename}
```

Exemplo:

```txt
audit-photos/8e8f-audit/9a9b-answer/2026-06-10-fridge-display.jpg
```

---

## 9. Row Level Security

Ativar RLS em todas as tabelas principais:

```sql
alter table profiles enable row level security;
alter table stores enable row level security;
alter table audits enable row level security;
alter table audit_questions enable row level security;
alter table audit_answers enable row level security;
alter table audit_photos enable row level security;
alter table ai_reports enable row level security;
alter table action_plans enable row level security;
alter table action_plan_items enable row level security;
```

### 9.1 Função auxiliar para role

```sql
create or replace function public.get_user_role(user_id uuid)
returns text
language sql
security definer
as $$
  select role from public.profiles where id = user_id;
$$;
```

### 9.2 Regra base

Admin pode ver tudo.

Auditor só vê o que pertence ao próprio `auditor_id`.

Manager será preparado para futuro, mas não precisa estar funcional na primeira versão.

---

## 10. Checklist Inicial

As perguntas devem ser carregadas na tabela `audit_questions` via seed.

### 10.1 Store Standards / Visual & Merchandising

```txt
Was the shop entrance clean, tidy and well presented?
Were the main fridge displays neat, full and front-facing?
Were hot food displays well presented and clearly labelled?
Were snacks and bakery displays tidy and well stocked?
Were all labels and price tickets visible and correctly positioned?
Were products aligned and easy for customers to shop?
```

### 10.2 Availability / Selection

```txt
Did every cold food price ticket have at least one product available?
Did every hot food price ticket have at least one product available?
Were snacks and bottled drinks available?
Was the bakery selection appropriate for the time of day?
Were missing or low products communicated to the MOD?
Was the team actively maintaining availability?
```

### 10.3 Speed

```txt
Was the queue time within the 60-second target?
Was the barista-prepared drink time within the 60-second target?
Were customers being prioritised?
Was the till area operating efficiently?
Was the barista area operating efficiently?
Were there visible bottlenecks affecting the customer experience?
```

### 10.4 Service & Customer Interaction

```txt
Did the team member greet the customer?
Did the team member smile?
Did the team member make eye contact?
Was the tone of voice friendly and natural?
Did the team member give a pleasant parting comment?
Was the customer acknowledged when the drink was handed over?
Did the team member offer to size up the drink where applicable?
Did the team member ask eat in or takeaway where applicable?
Did any team member deliver exceptional service?
```

### 10.5 Scenario Question

```txt
Was the team member knowledgeable?
Was the answer clear and helpful?
Was the team member friendly?
Did the team member engage naturally with the customer?
Did the answer improve the customer experience?
```

### 10.6 Product Quality

```txt
Was the food item presented correctly?
Was the food item served at the correct temperature?
Was the product easy to eat?
Was the filling or ingredient distribution correct?
Was the barista-prepared drink well presented?
Was the barista-prepared drink of expected quality?
```

### 10.7 Cleanliness & Facilities

```txt
Were the floors clean and tidy?
Were tables and seating areas clean?
Was the bin station clean and tidy?
Were cutlery, sugars and customer-use items well stocked?
Was the till area clean?
Was the drink handoff area clean?
Was the overall shop environment well maintained?
```

### 10.8 Outstanding Service

```txt
Did any team member go above and beyond?
Would this service be worth mentioning to others?
Was there a specific moment of exceptional care?
```

### 10.9 Menu / Product Feedback

```txt
Product Name
Taste Score
Packaging & Presentation Score
Value Score
Product Comment
Product Photo
```

### 10.10 Information Only

```txt
Was a manager visible on duty?
Were opening hours displayed?
Was the customer asked to size up?
Was the customer asked eat in or takeaway?
Was the customer charged correctly?
Server name or description
Scenario team member name or description
Additional notes
```

---

## 11. Scoring Engine

Criar função:

```txt
lib/scoring/calculateScore.ts
```

### 11.1 Regras

```txt
N/A não conta no score.
Score vazio em pergunta obrigatória bloqueia finalização.
Perguntas críticas sem resposta bloqueiam finalização.
Score máximo padrão é 5.
```

### 11.2 Fórmula

```txt
Section Score = soma dos scores válidos da seção
Section Max Score = soma dos max_scores aplicáveis da seção
Section Percentage = Section Score / Section Max Score * 100

Total Score = soma dos section scores
Max Score = soma dos section max scores
Final Percentage = Total Score / Max Score * 100
```

### 11.3 Rating Bands

```txt
95%–100% = Excellent / Bonus Standard
85%–94% = Good
70%–84% = Needs Focus
Below 70% = Critical Training Required
```

### 11.4 Interface TypeScript

```ts
export type ScoreRating =
  | 'Excellent / Bonus Standard'
  | 'Good'
  | 'Needs Focus'
  | 'Critical Training Required';

export interface ScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  finalRating: ScoreRating;
  sections: {
    sectionName: string;
    score: number;
    maxScore: number;
    percentage: number;
    rating: ScoreRating;
  }[];
}
```

---

## 12. Fluxo de Auditoria

### 12.1 Criar auditoria

1. Usuário clica em **Start New Audit**.
2. Preenche dados iniciais.
3. Sistema cria registro em `audits` com status `Draft`.
4. Sistema carrega perguntas ativas de `audit_questions`.
5. Sistema cria ou prepara respostas em `audit_answers`.

### 12.2 Preencher checklist

1. Usuário navega por seção.
2. Escolhe score.
3. Adiciona comentário se necessário.
4. Adiciona foto se necessário.
5. Sistema salva automaticamente ou por botão **Save Draft**.

### 12.3 Revisar

1. Sistema calcula score.
2. Sistema mostra campos faltando.
3. Sistema impede conclusão se houver perguntas obrigatórias vazias.
4. Usuário revisa.

### 12.4 Finalizar

1. Usuário clica **Complete Audit**.
2. Sistema recalcula score.
3. Sistema salva score em `audits`.
4. Status muda para `Completed`.
5. Auditoria fica bloqueada para edição.

### 12.5 Gerar IA

1. Usuário clica **Generate AI Action Plan**.
2. Backend carrega dados completos da auditoria.
3. Backend monta prompt.
4. Backend chama OpenAI.
5. Sistema salva resposta em `ai_reports`.
6. Sistema cria `action_plans` e `action_plan_items`.
7. Status muda para `AI Report Generated` ou `Action Plan Open`.

---

## 13. Upload de Fotos

### 13.1 Frontend

Usar input:

```html
<input type="file" accept="image/*" capture="environment" />
```

### 13.2 Regras

- Mostrar preview antes de enviar.
- Comprimir imagem antes do upload quando possível.
- Vincular foto ao `answer_id`.
- Permitir legenda.
- Permitir remover foto antes de finalizar auditoria.

### 13.3 Compressão

Usar uma função utilitária:

```txt
lib/utils/compressImage.ts
```

Limite recomendado:

```txt
Max width: 1600px
Quality: 0.75
Format: WEBP or JPEG
```

---

## 14. Relatório Final

### 14.1 Tela

Rota:

```txt
/audits/[id]/report
```

A tela deve mostrar:

```txt
Store Audit Report
Audit Summary
Score Overview
Category Breakdown
What Went Well
What Needs Improvement
AI Action Plan
Coaching Notes
Photo Evidence
Follow-up Actions
```

### 14.2 Dados

A tela deve buscar:

- `audits`
- `stores`
- `profiles`
- `audit_answers`
- `audit_photos`
- `ai_reports`
- `action_plans`
- `action_plan_items`

### 14.3 Relatório sem IA

Se a IA ainda não foi gerada, mostrar:

```txt
AI Action Plan has not been generated yet.
```

E botão:

```txt
Generate AI Action Plan
```

---

## 15. Integração com OpenAI

### 15.1 API Route

Criar:

```txt
app/api/ai/generate-report/route.ts
```

### 15.2 Fluxo da API

1. Receber `auditId`.
2. Validar usuário autenticado.
3. Validar permissão:
   - Admin pode gerar para qualquer auditoria.
   - Auditor pode gerar apenas para suas próprias auditorias.
4. Buscar dados completos.
5. Montar prompt.
6. Chamar OpenAI.
7. Salvar AI report.
8. Salvar action plan.
9. Retornar resultado para frontend.

### 15.3 Prompt Base

```txt
You are an expert retail operations coach.

Generate a professional store audit report in English based only on the audit data provided.

Do not invent facts. Do not mention anything that is not present in the audit data.

The report must be clear, practical, supportive and focused on team training.

Return the response in JSON with this structure:

{
  "executive_summary": "",
  "what_went_well": [],
  "what_needs_improvement": [],
  "priority_focus": "",
  "action_plan": [
    {
      "action": "",
      "owner": "",
      "priority": "",
      "due_date": "",
      "success_measure": ""
    }
  ],
  "coaching_notes": "",
  "message_to_the_team": "",
  "follow_up_recommendations": []
}

Audit Data:
{{AUDIT_DATA}}
```

### 15.4 Regras da IA

```txt
Não inventar fatos.
Não mencionar fotos se não houver legenda/dado.
Não criar nomes de pessoas inexistentes.
Não alterar score.
Não suavizar problemas críticos.
Não ser agressiva.
Escrever sempre em inglês.
```

---

## 16. Exportação em PDF

### 16.1 Rota

```txt
app/api/pdf/generate/route.ts
```

### 16.2 Opções Técnicas

Opção 1:

```txt
Gerar PDF no frontend usando html2canvas + jsPDF.
```

Opção 2:

```txt
Gerar PDF no backend usando Playwright ou Puppeteer.
```

### 16.3 Recomendação

Para MVP:

```txt
Usar frontend com html2pdf.js ou jsPDF.
```

Para versão mais profissional:

```txt
Usar backend com Playwright/Puppeteer.
```

### 16.4 Estrutura do PDF

```txt
Store Audit Report
Audit Summary
Score Overview
Category Breakdown
What Went Well
What Needs Improvement
AI Action Plan
Photo Evidence
Follow-up Actions
```

---

## 17. PWA

### 17.1 Arquivos

```txt
public/manifest.json
public/icons/icon-192.png
public/icons/icon-512.png
public/service-worker.js
```

### 17.2 manifest.json

```json
{
  "name": "Store Audit Trainer",
  "short_name": "Audit Trainer",
  "description": "Mobile-first store audit and training app.",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111827",
  "orientation": "portrait"
}
```

### 17.3 Regras

- App deve ser instalável no celular.
- Deve abrir direto no dashboard após login.
- Deve ser mobile-first.
- Offline completo não é obrigatório na primeira versão.

---

## 18. Middleware e Proteção de Rotas

Criar middleware para:

- bloquear rotas privadas se usuário não estiver logado;
- redirecionar usuário logado de `/login` para `/dashboard`;
- bloquear rotas `/admin` para não-admins.

### 18.1 Rotas públicas

```txt
/login
/reset-password
```

### 18.2 Rotas privadas

```txt
/dashboard
/audits/*
/admin/*
/settings
```

### 18.3 Regras

```txt
Usuário não logado → /login
Auditor tentando acessar /admin → /dashboard
Admin logado → pode acessar /admin
```

---

## 19. Componentes Principais

### 19.1 Auth

```txt
LoginForm
PasswordResetForm
ProtectedRoute
RoleGuard
```

### 19.2 Dashboard

```txt
AuditorDashboard
AdminDashboard
AuditCard
ScoreSummaryCard
RecentAuditsList
```

### 19.3 Audit

```txt
NewAuditForm
AuditProgress
AuditSectionStepper
AuditReviewSummary
CompleteAuditButton
```

### 19.4 Checklist

```txt
ChecklistSection
ChecklistQuestion
ScoreSelector
CommentBox
PhotoUploader
CriticalIssueToggle
```

### 19.5 Report

```txt
AuditSummary
ScoreOverview
CategoryBreakdown
AiReportSection
ActionPlanList
PhotoEvidenceGallery
PdfExportButton
```

### 19.6 Admin

```txt
AdminStatsCards
AuditFilters
AllAuditsTable
UsersTable
StoresTable
AdminAuditDetail
```

---

## 20. Tipos TypeScript

### 20.1 UserRole

```ts
export type UserRole = 'admin' | 'auditor' | 'manager';
```

### 20.2 AuditStatus

```ts
export type AuditStatus =
  | 'Draft'
  | 'In Progress'
  | 'Ready for Review'
  | 'Completed'
  | 'AI Report Generated'
  | 'Action Plan Open'
  | 'Action Plan Completed';
```

### 20.3 Audit

```ts
export interface Audit {
  id: string;
  store_id: string;
  auditor_id: string;
  manager_name?: string;
  visit_date: string;
  visit_time: string;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  traffic_level: 'Low' | 'Medium' | 'High';
  visit_type: 'Training Audit' | 'Follow-up Audit' | 'Mystery Shop Simulation';
  status: AuditStatus;
  total_score: number;
  max_score: number;
  percentage: number;
  final_rating?: string;
  initial_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

### 20.4 AuditAnswer

```ts
export interface AuditAnswer {
  id: string;
  audit_id: string;
  question_id?: string;
  section_name: string;
  question_text_snapshot: string;
  score?: number;
  max_score: number;
  is_na: boolean;
  comment?: string;
  is_critical_issue: boolean;
  created_at: string;
  updated_at: string;
}
```

### 20.5 AiReport

```ts
export interface AiReport {
  id: string;
  audit_id: string;
  executive_summary?: string;
  what_went_well?: string;
  what_needs_improvement?: string;
  priority_focus?: string;
  coaching_notes?: string;
  team_message?: string;
  follow_up_recommendations?: string;
  raw_ai_response?: unknown;
  created_at: string;
  updated_at: string;
}
```

---

## 21. UX Mobile

### 21.1 Regras

- Botões grandes.
- Nada de formulário gigante em uma única tela.
- Usar cards por seção.
- Usar stepper ou progresso.
- Botão **Save Draft** sempre visível.
- Botão **Next Section** fixo no rodapé.
- Score selector fácil de tocar.
- Upload de foto com preview grande.
- Relatório legível no celular.

### 21.2 Score Selector

Opções:

```txt
0
1
2
3
4
5
N/A
```

Cada opção deve ser um botão grande.

---

## 22. Validações

### 22.1 New Audit

Obrigatório:

```txt
Store
Visit Date
Visit Time
Auditor
Shift
Traffic Level
Visit Type
```

### 22.2 Checklist

Obrigatório:

```txt
Score ou N/A para perguntas obrigatórias
Comentário para score 0, 1 ou 2
Comentário para critical issue
```

### 22.3 Complete Audit

Bloquear finalização se:

```txt
Existirem perguntas obrigatórias sem resposta.
Existirem perguntas críticas sem resposta.
Score estiver inconsistente.
Auditoria já estiver Completed.
Usuário não tiver permissão.
```

---

## 23. Admin Dashboard

### 23.1 Métricas

```txt
Total audits
Average score
Audits this week
Audits this month
Lowest category
Best category
Most common issue
Open action plans
```

### 23.2 Filtros

```txt
Store
Auditor
Date range
Score range
Status
Category
```

### 23.3 Tabela

Colunas:

```txt
Store
Auditor
Date
Score
Rating
Status
Actions
```

Ações:

```txt
Open Report
View Details
Export PDF
Generate AI Report
```

---

## 24. Auditor Dashboard

### 24.1 Cards

```txt
Start New Audit
In Progress Audits
Completed Audits
Average Score
Latest Report
```

### 24.2 Lista

Mostrar:

```txt
Store
Date
Status
Score
Continue / Open Report
```

---

## 25. Regras de Edição

```txt
Draft: pode editar.
In Progress: pode editar.
Ready for Review: pode editar.
Completed: bloqueado.
AI Report Generated: bloqueado.
Action Plan Open: bloqueado.
Action Plan Completed: bloqueado.
```

Admin pode reabrir auditoria no futuro, mas isso não é obrigatório na primeira versão.

---

## 26. Erros e Feedback

O app deve mostrar mensagens claras em inglês.

Exemplos:

```txt
Audit saved successfully.
Photo uploaded successfully.
You do not have permission to view this audit.
Please complete all required questions before finishing the audit.
AI report generated successfully.
Something went wrong. Please try again.
```

---

## 27. Testes Obrigatórios

### 27.1 Auth

```txt
Login funciona.
Logout funciona.
Usuário não logado não acessa dashboard.
Auditor não acessa admin.
Admin acessa admin.
```

### 27.2 Auditoria

```txt
Criar auditoria.
Salvar draft.
Preencher checklist.
Adicionar comentário.
Adicionar foto.
Calcular score.
Finalizar auditoria.
Bloquear edição após finalizar.
```

### 27.3 Admin

```txt
Admin vê todas auditorias.
Auditor vê apenas as próprias.
Admin filtra auditorias.
Admin abre relatório de qualquer usuário.
```

### 27.4 IA

```txt
Gerar relatório com dados reais.
Não gerar relatório sem auditId válido.
Não permitir auditor gerar relatório de auditoria de outro usuário.
Salvar AI report corretamente.
Criar action plan items.
```

### 27.5 PDF

```txt
Exportar PDF.
PDF contém score.
PDF contém action plan.
PDF contém photo evidence quando houver fotos.
```

---

## 28. Ordem de Implementação para Agentes de IA

A implementação deve seguir esta ordem:

```txt
1. Criar projeto Next.js com TypeScript e Tailwind.
2. Configurar Supabase client/server.
3. Criar schema SQL.
4. Criar RLS policies.
5. Criar seed do checklist.
6. Criar login.
7. Criar profiles e roles.
8. Criar middleware de proteção.
9. Criar dashboards.
10. Criar fluxo de nova auditoria.
11. Criar checklist.
12. Criar scoring engine.
13. Criar upload de fotos.
14. Criar review screen.
15. Criar final report.
16. Criar OpenAI API route.
17. Criar AI report parser.
18. Criar action plan.
19. Criar PDF export.
20. Configurar PWA.
21. Testar no desktop.
22. Testar no celular.
23. Corrigir bugs.
24. Fazer polish visual.
```

---

## 29. Commits Recomendados

```txt
feat: initialize Next.js project
feat: configure Supabase
feat: add database schema
feat: add auth flow
feat: add role-based access
feat: add dashboards
feat: add audit creation flow
feat: add checklist engine
feat: add scoring engine
feat: add photo upload
feat: add review screen
feat: add final report
feat: add AI action plan generation
feat: add PDF export
feat: configure PWA
fix: improve mobile usability
fix: secure RLS policies
chore: final testing and cleanup
```

---

## 30. Regras para Agentes de IA

Qualquer agente de IA deve seguir estas regras:

```txt
1. Não alterar o nome do app sem aprovação.
2. Não mudar a stack sem aprovação.
3. Não adicionar funcionalidades fora do escopo.
4. Não criar app nativo.
5. Não colocar português na interface.
6. Não colocar português nos relatórios.
7. Não expor OpenAI API Key no frontend.
8. Não expor Supabase Service Role Key no frontend.
9. Não desativar RLS.
10. Não permitir auditor ver auditorias de outros usuários.
11. Não permitir edição de auditoria completed.
12. Não inventar dados no relatório de IA.
13. Criar componentes simples e reutilizáveis.
14. Priorizar mobile-first.
15. Testar cada fase antes de avançar.
```

---

## 31. Critério de Pronto

A primeira versão é considerada pronta quando:

```txt
Usuário consegue logar.
Admin consegue ver tudo.
Auditor consegue ver apenas o próprio conteúdo.
Auditor consegue criar auditoria.
Auditor consegue preencher checklist.
Auditor consegue tirar/enviar fotos.
Sistema calcula score corretamente.
Auditor consegue finalizar auditoria.
Sistema bloqueia edição após finalização.
IA gera relatório em inglês.
Plano de ação é salvo.
Relatório final aparece corretamente.
PDF é exportado.
PWA pode ser instalado no celular.
```

---

## 32. Definição Técnica Final

**Store Audit Trainer** deve ser implementado como um PWA profissional, simples e mobile-first, usando Next.js, TypeScript, Tailwind, Supabase e OpenAI API.

O app deve ter autenticação, papéis de Admin e Auditor, auditorias estruturadas, evidência por foto, cálculo de score, relatório final em inglês, plano de ação com IA e exportação em PDF.

O app deve permanecer simples, rápido, seguro e fácil de usar durante uma auditoria real dentro da loja.
