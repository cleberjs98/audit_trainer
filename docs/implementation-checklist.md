# Store Audit Trainer — Checklist de Implementação

> **Uso:** checklist de acompanhamento para execução do projeto.  
> **Idioma do app:** Inglês  
> **Idioma dos relatórios:** Inglês  
> **Stack:** Next.js + TypeScript + Tailwind CSS + Supabase + OpenAI API  
> **Regra fixa:** cada fase termina com limpeza, validação estrutural e commit.

---

## Como usar este checklist

Marque cada item conforme o avanço:

```txt
[ ] Não iniciado
[x] Concluído
[~] Em andamento
[!] Bloqueado / precisa revisão
```

Ao final de cada fase, confirmar sempre:

```txt
[ ] Código limpo
[ ] Sem imports não usados
[ ] Sem console.log desnecessário
[ ] Sem código duplicado
[ ] Sem chave sensível exposta
[ ] npm run lint executado
[ ] npm run typecheck executado
[ ] npm run build executado
[ ] Commit criado
```

## Registro de limitações V1

- [ ] Audit History V1, Review / Complete Audit V1 e Manual Action Plans V1 implementados; antes de implementar Photos, AI, PDF, email, User / Role Assignment ou Analytics, revisar `docs/v1-limitations-and-upgrades.md`
- [ ] Após o core flow estabilizar, limpar drift documentado e remover linguagem antiga de leader read-only, auditor e manager dos documentos legados

---

# FASE 0 — Preparação

## 0.1 Documentação

- [ ] Bíblia do App revisada
- [ ] Documento de Engenharia revisado
- [ ] Documento de Implementação revisado
- [ ] Documento UI/UX revisado
- [ ] Escopo confirmado
- [ ] Stack confirmada
- [ ] Idioma do app confirmado como inglês
- [ ] Idioma dos relatórios confirmado como inglês

## 0.2 Versionamento

- [ ] Repositório criado
- [ ] Branch principal definida
- [ ] Padrão de commits definido
- [ ] Pasta `docs/` criada
- [ ] Documentos adicionados ao projeto

## 0.3 Limpeza e consolidação

- [ ] Arquivos antigos removidos
- [ ] Documentação duplicada removida
- [ ] Estrutura inicial limpa
- [ ] Commit criado

**Commit sugerido:**  
```txt
chore: prepare implementation documentation
```

---

# FASE 1 — Setup Inicial do Projeto

## 1.1 Projeto Next.js

- [ ] Projeto Next.js criado
- [ ] App Router ativado
- [ ] TypeScript ativado
- [ ] Tailwind CSS instalado
- [ ] ESLint configurado
- [ ] Projeto roda localmente

## 1.2 Estrutura de pastas

- [ ] `components/` criado
- [ ] `components/ui/` criado
- [ ] `components/auth/` criado
- [ ] `components/dashboard/` criado
- [ ] `components/audit/` criado
- [ ] `components/checklist/` criado
- [ ] `components/report/` criado
- [ ] `components/admin/` criado
- [ ] `lib/` criado
- [ ] `lib/supabase/` criado
- [ ] `lib/scoring/` criado
- [ ] `lib/ai/` criado
- [ ] `lib/pdf/` criado
- [ ] `types/` criado
- [ ] `data/` criado
- [ ] `supabase/` criado
- [ ] `public/icons/` criado

## 1.3 Scripts

- [ ] Script `dev` configurado
- [ ] Script `build` configurado
- [ ] Script `lint` configurado
- [ ] Script `typecheck` configurado
- [ ] `npm run dev` funciona
- [ ] `npm run build` funciona
- [ ] `npm run typecheck` funciona

## 1.4 Limpeza e consolidação

- [ ] Boilerplate removido
- [ ] Layout inicial padronizado
- [ ] Imports não usados removidos
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: initialize Next.js project structure
```

---

# FASE 2 — Supabase

## 2.1 Variáveis de ambiente

- [ ] `.env.local` criado
- [ ] `.env.example` criado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` documentado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` documentado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` documentado sem expor valor
- [ ] `OPENAI_API_KEY` documentado sem expor valor
- [ ] Nenhuma chave real commitada

## 2.2 Supabase client/server

- [ ] `lib/supabase/client.ts` criado
- [ ] `lib/supabase/server.ts` criado
- [ ] Client usa apenas variáveis públicas
- [ ] Service role não aparece no frontend

## 2.3 Tipos base

- [ ] `types/user.ts` criado
- [ ] `types/audit.ts` criado
- [ ] `types/report.ts` criado
- [ ] `types/database.ts` criado
- [ ] Sem dependência circular

## 2.4 Limpeza e consolidação

- [ ] Imports revisados
- [ ] Variáveis revisadas
- [ ] Código de teste removido
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: configure Supabase clients and environment
```

---

# FASE 3 — Banco de Dados e Segurança

## 3.1 Schema SQL

- [ ] Tabela `areas` criada
- [ ] Tabela `profiles` criada
- [ ] Tabela `stores` criada
- [ ] Tabela `audits` criada
- [ ] Tabela `audit_questions` criada
- [ ] Tabela `audit_answers` criada
- [ ] Tabela `audit_photos` criada
- [ ] Tabela `ai_reports` criada
- [ ] Tabela `action_plans` criada
- [ ] Tabela `action_plan_items` criada
- [ ] Relacionamentos criados
- [ ] Checks básicos criados

## 3.2 Funções auxiliares

- [ ] Função `get_user_role(user_id uuid)` criada
- [ ] Função `is_admin(user_id uuid)` criada ou avaliada
- [ ] Funções testadas

## 3.3 RLS Policies

- [ ] RLS ativado em `profiles`
- [ ] RLS ativado em `stores`
- [ ] RLS ativado em `audits`
- [ ] RLS ativado em `audit_questions`
- [ ] RLS ativado em `audit_answers`
- [ ] RLS ativado em `audit_photos`
- [ ] RLS ativado em `ai_reports`
- [ ] RLS ativado em `action_plans`
- [ ] RLS ativado em `action_plan_items`
- [ ] Admin pode gerenciar tudo
- [ ] Admin pode criar e atualizar todas as áreas
- [ ] Admin pode criar e atualizar todas as lojas
- [ ] Area Manager vê apenas lojas da área
- [ ] Area Manager pode criar e atualizar lojas somente dentro da própria área após follow-up RLS específico
- [ ] Area Manager não cria nem atualiza áreas em V1
- [ ] Store Manager vê apenas a própria loja
- [ ] Store Manager não cria lojas
- [ ] Leader vê auditorias da própria loja
- [ ] Leader não cria lojas
- [ ] Auditoria Completed não pode ser editada por usuários comuns

## 3.4 Seed mínimo

- [ ] Área inicial `Dublin` criada
- [ ] Store inicial `Dublin Airport` criada
- [ ] Store code inicial `5292` criado
- [ ] Seed limitado a starter area/store, checklist sections e audit questions
- [ ] Futuras lojas não dependem de edição de seed files
- [ ] Perguntas de Store Standards inseridas
- [ ] Perguntas de Availability inseridas
- [ ] Perguntas de Speed inseridas
- [ ] Perguntas de Service inseridas
- [ ] Perguntas de Scenario Question inseridas
- [ ] Perguntas de Product Quality inseridas
- [ ] Perguntas de Cleanliness inseridas
- [ ] Perguntas de Outstanding Service inseridas
- [ ] Perguntas de Menu/Product Feedback inseridas
- [ ] Perguntas Information Only inseridas
- [ ] Todas as perguntas em inglês
- [ ] Sort order correto

## 3.5 Storage

- [ ] Bucket `audit-photos` criado
- [ ] Policies de upload criadas
- [ ] Policies de leitura criadas
- [ ] Admin acessa todas as fotos
- [ ] Usuários acessam fotos conforme loja/área

## 3.6 Limpeza e consolidação

- [ ] SQL revisado
- [ ] Policies duplicadas removidas
- [ ] Seed não duplica área, store, seções ou perguntas
- [ ] Migration executa sem erro
- [ ] Seed executa sem erro
- [ ] Follow-up migration registrada se `stores_insert`/`stores_update` ainda forem admin-only
- [ ] Teste de permissão realizado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add database schema, RLS policies and checklist seed
```

---

# FASE 4 — Autenticação

## 4.1 Login

- [ ] Rota `/login` criada
- [ ] Componente `LoginForm` criado
- [ ] Campo `Email` criado
- [ ] Campo `Password` criado
- [ ] Botão `Sign In` criado
- [ ] Link `Forgot Password?` criado
- [ ] Mensagens de erro em inglês

## 4.2 Logout

- [ ] Ação de logout criada
- [ ] Botão `Sign Out` criado
- [ ] Sessão encerra corretamente

## 4.3 Proteção de rotas

- [ ] Middleware criado
- [ ] Usuário sem login vai para `/login`
- [ ] Usuário logado não acessa `/login`
- [ ] Rotas privadas protegidas

## 4.4 Validação visual necessária

- [ ] Login visualmente alinhado ao design system
- [ ] Fundo creme claro aplicado
- [ ] Bordô aplicado no botão principal
- [ ] Card de login arredondado
- [ ] App name exibido como `Audit Trainer`

## 4.5 Limpeza e consolidação

- [ ] Estados duplicados removidos
- [ ] Helpers centralizados
- [ ] Console logs removidos
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add authentication flow
```

---

# FASE 5 — Roles e Acessos

## 5.1 Roles oficiais

- [ ] Role `admin` criada
- [ ] Role `area_manager` criada
- [ ] Role `store_manager` criada
- [ ] Role `leader` criada

## 5.2 Leitura de profile

- [ ] Profile do usuário logado é carregado
- [ ] Role é identificada
- [ ] Store/area atribuída é identificada

## 5.3 RoleGuard

- [ ] `RoleGuard` criado
- [ ] Admin acessa tudo
- [ ] Area Manager acessa área atribuída
- [ ] Store Manager acessa própria loja
- [ ] Leader acessa própria loja
- [ ] Usuário sem permissão é redirecionado

## 5.4 Redirecionamento

- [ ] Admin vai para `/admin`
- [ ] Area Manager vai para dashboard de área
- [ ] Store Manager vai para dashboard de loja
- [ ] Leader vai para dashboard da loja

## 5.5 Limpeza e consolidação

- [ ] Lógica duplicada de role removida
- [ ] Tipos centralizados
- [ ] Middleware revisado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add role-based access control
```

---

# FASE 6 — Design System e Layout Base

## 6.1 Tokens visuais

- [ ] Cor Primary Burgundy definida
- [ ] Cor Dark Burgundy definida
- [ ] Cor Cream Background definida
- [ ] Cor Light Surface definida
- [ ] Cor Text Black definida
- [ ] Cor Muted Text definida
- [ ] Cor Border definida
- [ ] Cores de status definidas: verde, amarelo/âmbar, vermelho
- [ ] Tailwind theme atualizado

## 6.2 AppShell

- [ ] `AppShell` criado
- [ ] `MobileHeader` criado
- [ ] `PageContainer` criado
- [ ] Navegação base criada
- [ ] Layout mobile-first aplicado

## 6.3 Componentes UI

- [ ] `Button` criado
- [ ] `Card` criado
- [ ] `Input` criado
- [ ] `Select` criado
- [ ] `Textarea` criado
- [ ] `Badge` criado
- [ ] `LoadingState` criado
- [ ] `EmptyState` criado
- [ ] `ErrorMessage` criado

## 6.4 Validação visual necessária

- [ ] Visual segue creme claro + bordô
- [ ] Cards têm borda bege sutil
- [ ] Botões têm tamanho confortável
- [ ] Tipografia legível no celular
- [ ] Sem overflow horizontal

## 6.5 Limpeza e consolidação

- [ ] Estilos duplicados removidos
- [ ] Classes Tailwind padronizadas
- [ ] Componentes sem uso removidos
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add mobile-first design system and app shell
```

---

# FASE 7 — Dashboard Store / Leader

## 7.1 Dashboard da loja

- [ ] Rota `/dashboard` criada
- [ ] Store selector ou store label criado
- [ ] `Performance Overview` criado
- [ ] Card `Average Score` criado
- [ ] Card `Open Action Plans` criado
- [ ] Card `Needs Focus` criado
- [ ] CTA `Start New Audit` criado

## 7.2 Recent Audits

- [ ] Lista de auditorias recentes criada
- [ ] Mostra somente auditorias da própria loja
- [ ] Score aparece como pontos + porcentagem
- [ ] Status chips criados
- [ ] Botão `View All` criado

## 7.3 Validação visual necessária

- [ ] Dashboard segue mockup aprovado
- [ ] Foco em performance e action plans
- [ ] CTA de nova auditoria visível, mas não dominante demais
- [ ] Cards legíveis no celular

## 7.4 Limpeza e consolidação

- [ ] Dados mockados removidos
- [ ] Queries centralizadas
- [ ] Estado vazio criado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add store dashboard
```

---

# FASE 8 — Dashboard Area Manager

## 8.1 Dashboard de área

- [ ] Rota de dashboard de área criada
- [ ] Area selector criado
- [ ] Card `Average Score` criado
- [ ] Card `Stores` criado
- [ ] Card `Open Action Plans` criado
- [ ] Card `Critical Alerts` criado

## 8.2 Store Performance

- [ ] Ranking de lojas criado
- [ ] Score por loja exibido
- [ ] Status por loja exibido
- [ ] Link para relatório/loja criado

## 8.3 Priority Focus

- [ ] Lista de áreas críticas criada
- [ ] Prioridade exibida
- [ ] Quantidade de lojas abaixo da meta exibida

## 8.4 Validação visual necessária

- [ ] Dashboard segue mockup aprovado
- [ ] Performance e action plans são o foco
- [ ] Bottom navigation ou navegação equivalente funciona
- [ ] Cards legíveis no celular

## 8.5 Limpeza e consolidação

- [ ] Queries duplicadas removidas
- [ ] Componentes reaproveitados
- [ ] Permissões por área revisadas
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add area manager dashboard
```

---

# FASE 9 — Stores

## 9.1 Stores iniciais

- [ ] Área inicial `Dublin` disponível
- [ ] Store inicial `Dublin Airport` disponível
- [ ] Store code `5292` disponível
- [ ] Área `Dublin` atribuída à store
- [ ] Store ativa aparece nos selects

## 9.2 Admin stores

- [ ] Rota `/admin/stores` criada
- [ ] Lista de lojas criada
- [ ] Formulário de criação criado
- [ ] Campos `Name`, `Code`, `Area`, `Active` criados
- [ ] Admin pode criar stores em qualquer área
- [ ] Admin pode atualizar stores em qualquer área

## 9.3 Area Manager stores

- [ ] Confirmar que follow-up migration permite `stores_insert` para `area_id = get_my_area_id()`
- [ ] Confirmar que follow-up migration permite `stores_update` somente dentro de `get_my_area_id()`
- [ ] Confirmar que Area Manager não consegue mover store para outra área
- [ ] Area Manager pode criar stores somente na própria área
- [ ] Area Manager pode atualizar stores somente na própria área
- [ ] Area Manager não consegue criar ou atualizar áreas

## 9.4 Limpeza e consolidação

- [ ] Stores mockadas removidas
- [ ] Selects usam dados reais
- [ ] Permissões revisadas
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add store management basics
```

---

# FASE 10 — New Audit

## 10.1 Tela New Audit

- [ ] Rota `/audits/new` criada
- [ ] Campo `Store` criado
- [ ] Campo `Visit Date` criado
- [ ] Campo `Visit Time` criado
- [ ] Campo `MOD / Manager on Duty` criado
- [ ] Campo `Shift` criado
- [ ] Campo `Traffic Level` criado
- [ ] Campo `Visit Type` criado
- [ ] Campo `Initial Notes` criado

## 10.2 Salvar auditoria

- [ ] Cria registro em `audits`
- [ ] Status inicial `Draft`
- [ ] Usuário logado salvo como criador
- [ ] Redireciona para checklist

## 10.3 Validações

- [ ] Store obrigatório
- [ ] Visit Date obrigatório
- [ ] Visit Time obrigatório
- [ ] Shift obrigatório
- [ ] Traffic Level obrigatório
- [ ] Visit Type obrigatório
- [ ] Mensagens em inglês

## 10.4 Validação visual necessária

- [ ] Tela segue mockup aprovado
- [ ] Card central limpo
- [ ] Botão `Start Audit` em bordô
- [ ] Botão `Save Draft` secundário

## 10.5 Limpeza e consolidação

- [ ] Mock removido
- [ ] Tipos centralizados
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add new audit creation flow
```

---

# FASE 11 — Checklist Engine

## 11.1 Rota checklist

- [ ] Rota `/audits/[id]/checklist` criada
- [ ] Audit é carregada
- [ ] Perguntas são carregadas
- [ ] Respostas existentes são carregadas

## 11.2 Seções

- [ ] Perguntas agrupadas por seção
- [ ] Uma seção por vez
- [ ] Progresso exibido
- [ ] Navegação `Previous Section`
- [ ] Navegação `Next Section`

## 11.3 Question cards

- [ ] Card por pergunta criado
- [ ] Score selector 0–5 criado
- [ ] Opção `N/A` criada
- [ ] Campo `Add a comment...` criado
- [ ] Botão `Add Photo` criado
- [ ] Toggle `Critical Issue` criado

## 11.4 Persistência

- [ ] Respostas salvam em `audit_answers`
- [ ] Snapshot da pergunta é salvo
- [ ] Respostas recarregam corretamente
- [ ] N/A persiste corretamente
- [ ] Comentário persiste corretamente

## 11.5 Validação visual necessária

- [ ] Tela segue mockup aprovado
- [ ] Todos os cards da seção aparecem abertos
- [ ] Score buttons são fáceis de tocar
- [ ] Botão `Next Section` dominante
- [ ] `Save Draft` visível

## 11.6 Limpeza e consolidação

- [ ] Estados duplicados removidos
- [ ] Respostas duplicadas evitadas
- [ ] Ordenação revisada
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add checklist engine and answer persistence
```

---

# FASE 12 — Scoring Engine

## 12.1 Função de score

- [ ] `calculateScore.ts` criado
- [ ] Total Score calcula
- [ ] Max Score calcula
- [ ] Percentage calcula
- [ ] Rating calcula
- [ ] Section Breakdown calcula

## 12.2 Regras de score

- [ ] N/A não conta
- [ ] Score vazio em obrigatória bloqueia finalização
- [ ] Comentário obrigatório para score 0, 1 ou 2
- [ ] Pergunta crítica sem resposta bloqueia finalização

## 12.3 Integração

- [ ] Score parcial aparece no checklist
- [ ] Score aparece no review
- [ ] Score salva em `audits`
- [ ] Rating salva em `audits`

## 12.4 Limpeza e consolidação

- [ ] Cálculos duplicados removidos
- [ ] Casos básicos testados
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add scoring engine
```

---

# FASE 13 — Upload de Fotos

## 13.1 PhotoUploader

- [ ] Componente `PhotoUploader` criado
- [ ] Input aceita imagem
- [ ] `capture="environment"` configurado
- [ ] Preview aparece antes do upload

## 13.2 Storage

- [ ] Upload para Supabase Storage funciona
- [ ] Caminho usa `audit_id`
- [ ] Caminho usa `answer_id`
- [ ] Registro criado em `audit_photos`

## 13.3 Legenda e remoção

- [ ] Campo `Caption` criado
- [ ] Legenda salva
- [ ] Foto pode ser removida antes de completar
- [ ] Arquivo removido quando possível

## 13.4 Validação visual necessária

- [ ] Botão `Add Photo` claro
- [ ] Preview legível
- [ ] Upload não polui o card da pergunta

## 13.5 Limpeza e consolidação

- [ ] Previews órfãos removidos
- [ ] Upload duplicado evitado
- [ ] Erro de upload tratado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add photo upload for audit answers
```

---

# FASE 14 — Review e Completion

## 14.1 Review Screen

- [x] Review integrado em `/audits/[auditId]` para V1
- [x] Audit Summary criado
- [x] Score Overview criado
- [ ] Section Breakdown detalhado permanece futuro
- [ ] Missing Required Questions criado
- [ ] Critical Issues criado
- [ ] Photos Attached criado

## 14.2 Complete Audit

- [x] Botão `Complete Audit` criado
- [x] Score recalculado pelo RPC ao completar
- [x] Status muda para `Completed`
- [x] `completed_at` salvo pelo trigger
- [x] Auditoria bloqueia edição

## 14.3 Validação visual necessária

- [ ] Tela segue mockup aprovado
- [ ] Score aparece como `76/95 · 80%`
- [ ] Status chip aparece
- [ ] Botão `Complete Audit` dominante
- [ ] Botão `Back to Checklist` secundário

## 14.4 Limpeza e consolidação

- [ ] Validações duplicadas removidas
- [ ] Mensagens em inglês
- [ ] Bloqueio pós-completion confirmado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add audit review and completion flow
```

---

# FASE 15 — Report sem IA

## 15.1 Report Screen

- [ ] Rota `/audits/[id]/report` criada
- [ ] `Store Audit Report` exibido
- [ ] Audit Summary exibido
- [ ] Score Overview exibido
- [ ] Category Breakdown exibido
- [ ] Photo Evidence exibido

## 15.2 Estado sem IA

- [ ] Mensagem `AI Action Plan has not been generated yet.` criada
- [ ] Botão `Generate AI Action Plan` criado

## 15.3 Limpeza e consolidação

- [ ] Componentes de score reaproveitados
- [ ] Layout mobile revisado
- [ ] Permissões revisadas
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add final report without AI
```

---

# FASE 16 — IA

## 16.1 API route

- [ ] Rota `app/api/ai/generate-report/route.ts` criada
- [ ] Recebe `auditId`
- [ ] Valida usuário autenticado
- [ ] Valida permissão

## 16.2 Payload da IA

- [ ] Audit carregada
- [ ] Store carregada
- [ ] Usuário que criou a auditoria carregado
- [ ] Answers carregadas
- [ ] Photo captions carregadas
- [ ] Section scores carregados

## 16.3 Prompt builder

- [ ] `buildAuditPrompt.ts` criado
- [ ] Prompt exige inglês
- [ ] Prompt exige JSON estruturado
- [ ] Prompt proíbe inventar fatos
- [ ] Prompt pede action plan com owner, priority, due date e success measure

## 16.4 OpenAI

- [ ] OpenAI chamada apenas no backend
- [ ] Chave não aparece no frontend
- [ ] Erro de IA tratado
- [ ] JSON inválido tratado

## 16.5 Persistência

- [ ] AI report salvo em `ai_reports`
- [ ] Action plan salvo em `action_plans`
- [ ] Action items salvos em `action_plan_items`
- [ ] Status atualizado para `AI Report Generated` ou `Action Plan Open`

## 16.6 Limpeza e consolidação

- [ ] Logs da IA removidos
- [ ] Permissões revisadas
- [ ] Chaves revisadas
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add AI action plan generation
```

---

# FASE 17 — Action Plan

## 17.1 Exibição

- [x] `/action-plans` list page criado
- [x] `/action-plans/[actionPlanId]` detail page criado
- [x] Dashboard Action Plans card habilitado
- [x] Completed audit detail mostra `Create Action Plan` ou `View Action Plan`
- [x] Manual action item description exibida
- [x] Owner exibido
- [x] Priority exibida
- [x] Due Date exibida
- [x] Success Measure exibida
- [x] Status exibido
- [x] Manual plans use completed audits and one plan per audit

## 17.2 Atualização de status

- [x] Admin pode criar e atualizar action plans no escopo total
- [x] Area Manager pode criar e atualizar action plans dentro da própria área
- [x] Store Manager pode criar e atualizar action plans da própria store
- [x] Leader apenas visualiza action plans em V1
- [x] Usuário sem permissão não altera status
- [x] No delete in V1

## 17.3 Página dedicada

- [x] Rota `/action-plans` criada
- [x] Rota `/action-plans/[actionPlanId]` criada
- [x] Plano de ação abre corretamente
- [x] Action item create/edit/status update implemented manually

## 17.4 Limpeza e consolidação

- [x] Lógica duplicada removida
- [x] Badges padronizados
- [x] Permissões revisadas
- [x] Lint executado
- [x] Typecheck executado
- [x] Build executado
- [x] Commit criado

## 17.5 Fora do escopo V1

- [ ] AI-generated action plans ainda não implementado
- [ ] PDF/export/email ainda não implementados
- [ ] Mobile QA final permanece pós-deploy em URL HTTPS real

**Commit sugerido:**  
```txt
feat: add manual action plans v1
```

---

# FASE 18 — Report com IA

## 18.1 Conteúdo no relatório

- [ ] Executive Summary exibido
- [ ] What Went Well exibido
- [ ] What Needs Improvement exibido
- [ ] Priority Focus exibido
- [ ] AI Action Plan exibido
- [ ] Coaching Notes exibido
- [ ] Message to the Team exibido
- [ ] Follow-up Recommendations exibido

## 18.2 Validação visual necessária

- [ ] Report segue mockup aprovado
- [ ] Foco em Action Plan
- [ ] Score hero claro
- [ ] Photo Evidence bem apresentado
- [ ] Botão `Export PDF` visível

## 18.3 Limpeza e consolidação

- [ ] Componentes duplicados removidos
- [ ] Conteúdo vazio tratado
- [ ] Texto em inglês confirmado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: display AI report and action plan
```

---

# FASE 19 — PDF Export

## 19.1 Estratégia

- [ ] Estratégia definida: `react-to-print`, `html2pdf.js` ou `jsPDF`
- [ ] Dependência instalada
- [ ] Componente `PdfExportButton` criado

## 19.2 Conteúdo do PDF

- [ ] Audit Summary incluído
- [ ] Score Overview incluído
- [ ] Category Breakdown incluído
- [ ] What Went Well incluído
- [ ] What Needs Improvement incluído
- [ ] AI Action Plan incluído
- [ ] Photo Evidence incluído
- [ ] Follow-up Actions incluído

## 19.3 Validação visual necessária

- [ ] PDF legível
- [ ] Imagens dimensionadas
- [ ] Sem corte grave
- [ ] Texto em inglês
- [ ] Layout profissional

## 19.4 Limpeza e consolidação

- [ ] Estilos de impressão revisados
- [ ] Teste com e sem fotos realizado
- [ ] Teste com e sem IA realizado
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add PDF export
```

---

# FASE 20 — PWA

## 20.1 Manifest

- [ ] `public/manifest.json` criado
- [ ] Name definido como `Audit Trainer`
- [ ] Short name definido
- [ ] Theme color bordô definido
- [ ] Background color creme definido
- [ ] Start URL definida

## 20.2 Ícones

- [ ] Ícone 192x192 criado
- [ ] Ícone 512x512 criado
- [ ] Ícone usa checklist em bordô
- [ ] Ícones referenciados no manifest

## 20.3 Service Worker

- [ ] PWA configurado
- [ ] Cache básico de assets
- [ ] Dados sensíveis não cacheados indevidamente
- [ ] Login não quebra

## 20.4 Validação visual necessária

- [ ] App instala no celular
- [ ] Ícone aparece corretamente
- [ ] Splash/abertura aceitável
- [ ] App abre em modo standalone

## 20.5 Limpeza e consolidação

- [ ] Manifest validado
- [ ] Ícones revisados
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: configure PWA installation
```

---

# FASE 21 — Admin Users

## 21.1 Página users

- [ ] Rota `/admin/users` criada
- [ ] Lista de usuários criada
- [ ] Nome exibido
- [ ] E-mail exibido
- [ ] Role exibida
- [ ] Store/Area exibida

## 21.2 Alteração de role

- [ ] Admin pode alterar role
- [ ] Admin pode atribuir loja
- [ ] Admin pode atribuir área
- [ ] Prevenção contra remover único Admin avaliada

## 21.3 Limpeza e consolidação

- [ ] Non-admin não acessa users
- [ ] Queries revisadas
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
feat: add basic admin user management
```

---

# FASE 22 — Refinamento Mobile

## 22.1 Touch targets

- [ ] Botões grandes o suficiente
- [ ] Score buttons fáceis de tocar
- [ ] Inputs legíveis
- [ ] Cards com bom espaçamento
- [ ] Sem overflow horizontal

## 22.2 Checklist mobile

- [ ] Next Section sempre claro
- [ ] Save Draft visível
- [ ] Add Photo claro
- [ ] Comentários fáceis de usar

## 22.3 Report mobile

- [ ] Score legível
- [ ] Fotos bem dimensionadas
- [ ] Action plan legível
- [ ] Export PDF visível

## 22.4 Limpeza e consolidação

- [ ] Classes duplicadas removidas
- [ ] Estilos comuns centralizados
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
fix: improve mobile usability
```

---

# FASE 23 — Segurança Final

## 23.1 Admin

- [ ] Admin vê todas auditorias
- [ ] Admin vê todos relatórios
- [ ] Admin vê todas fotos
- [ ] Admin acessa `/admin`
- [ ] Admin gera IA para qualquer auditoria
- [ ] Admin cria e atualiza todas as áreas
- [ ] Admin cria e atualiza todas as lojas

## 23.2 Area Manager

- [ ] Vê apenas lojas da área
- [ ] Vê relatórios da área
- [ ] Vê action plans da área
- [ ] Cria lojas somente na área atribuída, após follow-up RLS
- [ ] Atualiza lojas somente na área atribuída, após follow-up RLS
- [ ] Não cria nem atualiza áreas
- [ ] Não move stores para outra área
- [ ] Não vê outras áreas

## 23.3 Store Manager

- [ ] Vê apenas a própria loja
- [ ] Vê relatórios da própria loja
- [ ] Vê action plans da própria loja
- [ ] Não cria stores
- [ ] Não vê outras lojas

## 23.4 Leader

- [ ] Vê auditorias da própria loja
- [ ] Pode comparar auditorias da própria loja
- [ ] Não cria stores
- [ ] Não vê outras lojas
- [ ] Não acessa admin indevidamente

## 23.5 Chaves

- [ ] `OPENAI_API_KEY` não aparece no bundle
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não aparece no bundle
- [ ] Nenhuma chave real está commitada
- [ ] Logs sensíveis removidos

## 23.6 Limpeza e consolidação

- [ ] Policies corrigidas
- [ ] Bypasses temporários removidos
- [ ] Build final executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
fix: harden security and RLS policies
```

---

# FASE 24 — Teste End-to-End

## 24.1 Fluxo Leader

- [ ] Login como Leader
- [ ] Ver dashboard da própria loja
- [ ] Ver auditorias da própria loja
- [ ] Comparar auditorias da própria loja para aprendizado
- [ ] Confirmar que consegue criar auditoria para a loja atribuída
- [ ] Confirmar que consegue editar auditorias `draft`/`in_progress` da loja atribuída
- [ ] Confirmar que não consegue adicionar foto
- [ ] Confirmar que consegue finalizar auditorias desbloqueadas `draft`/`in_progress` da loja atribuída
- [ ] Confirmar que não acessa auditorias de outras lojas
- [ ] Confirmar que auditorias `completed`/locked ficam read-only
- [ ] Ver relatório existente
- [ ] Exportar PDF

## 24.2 Fluxo Store Manager

- [ ] Login como Store Manager
- [ ] Ver dashboard da loja
- [ ] Ver apenas a própria store
- [ ] Ver relatórios da loja
- [ ] Ver action plans da loja
- [ ] Confirmar que não consegue criar stores
- [ ] Não acessar outras lojas

## 24.3 Fluxo Area Manager

- [ ] Login como Area Manager
- [ ] Ver dashboard da área
- [ ] Ver lojas da área
- [ ] Criar store na própria área após follow-up RLS
- [ ] Atualizar store na própria área após follow-up RLS
- [ ] Confirmar bloqueio ao tentar criar/atualizar store fora da própria área
- [ ] Confirmar que não consegue criar áreas
- [ ] Ver relatórios das lojas da área
- [ ] Não acessar outra área

## 24.4 Fluxo Admin

- [ ] Login como Admin
- [ ] Ver todas auditorias
- [ ] Ver todos usuários
- [ ] Ver todas lojas
- [ ] Criar e atualizar áreas
- [ ] Criar e atualizar stores
- [ ] Gerar/regenerar IA
- [ ] Exportar PDF

## 24.5 PWA

- [ ] Abrir no navegador do celular
- [ ] Instalar PWA
- [ ] Abrir em modo standalone
- [ ] Login funciona
- [ ] Câmera/foto funciona
- [ ] Auditoria salva

## 24.6 Limpeza e consolidação

- [ ] Bugs corrigidos
- [ ] Dados de teste removidos quando necessário
- [ ] Console logs removidos
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit criado

**Commit sugerido:**  
```txt
test: complete end-to-end app validation
```

---

# FASE 25 — Polish Final e Entrega

## 25.1 Revisão de idioma

- [ ] Login em inglês
- [ ] Dashboard em inglês
- [ ] Admin em inglês
- [ ] New Audit em inglês
- [ ] Checklist em inglês
- [ ] Review em inglês
- [ ] Report em inglês
- [ ] Action Plan em inglês
- [ ] PDF em inglês
- [ ] Errors em inglês
- [ ] Empty states em inglês
- [ ] Buttons em inglês

## 25.2 Estados vazios e erros

- [ ] `No audits found.`
- [ ] `No photos uploaded.`
- [ ] `AI Action Plan has not been generated yet.`
- [ ] `You do not have permission to view this audit.`
- [ ] `Please complete all required questions before finishing the audit.`
- [ ] `Something went wrong. Please try again.`

## 25.3 README

- [ ] Project overview
- [ ] Stack
- [ ] Environment variables
- [ ] Setup
- [ ] Supabase setup
- [ ] Run locally
- [ ] Build
- [ ] Deployment notes

## 25.4 Limpeza e consolidação

- [ ] Arquivos temporários removidos
- [ ] Mocks desnecessários removidos
- [ ] Dados falsos hardcoded removidos
- [ ] Warnings revisados
- [ ] Lint executado
- [ ] Typecheck executado
- [ ] Build executado
- [ ] Commit final criado

**Commit sugerido:**  
```txt
chore: finalize first release
```

---

# Checklist Final de Pronto

- [ ] App em inglês
- [ ] Relatórios em inglês
- [ ] Login funcionando
- [ ] Admin funcionando
- [ ] Area Manager funcionando
- [ ] Store Manager funcionando
- [ ] Leader funcionando
- [ ] Permissões por loja/área funcionando
- [ ] Dashboard de loja funcionando
- [ ] Dashboard de área funcionando
- [ ] Nova auditoria funcionando
- [ ] Checklist funcionando
- [ ] Comentários salvando
- [ ] Fotos salvando
- [ ] Score calculando corretamente
- [ ] Review bloqueando auditoria incompleta
- [ ] Completed bloqueando edição
- [ ] Relatório final funcionando
- [ ] IA gerando relatório em inglês
- [ ] IA não inventando dados
- [ ] Action plan salvando
- [ ] PDF exportando
- [ ] PWA instalando
- [ ] RLS ativa
- [ ] Chaves protegidas
- [ ] Build final passando
