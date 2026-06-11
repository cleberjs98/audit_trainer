# Store Audit Trainer — Documento de Implementação por Fases e Subfases

> **Documento:** Plano de Implementação Cirúrgico  
> **Idioma da documentação:** Português  
> **Idioma do aplicativo:** Inglês  
> **Idioma dos relatórios:** Inglês  
> **Stack:** Next.js + TypeScript + Tailwind CSS + Supabase + OpenAI API  
> **Objetivo:** guiar Copilot/Codex/Claude/Cursor na construção do app em fases pequenas, controladas e fáceis de validar.

---

## 1. Princípio Central

Este app deve ser implementado em **fases curtas e cirúrgicas**.

Cada fase deve:

```txt
1. Ter um objetivo técnico claro.
2. Alterar apenas uma parte do sistema.
3. Ser validada estruturalmente pelo Copilot/agente.
4. Incluir limpeza ao final.
5. Ser commitada antes da próxima fase.
```

Não tentar construir múltiplas áreas grandes de uma vez.

O objetivo é evitar que o agente de IA gere código bonito, mas quebrado, duplicado, inseguro ou difícil de manter.

---

## 2. Regras Gerais para o Agente

O agente deve seguir estas regras durante toda a implementação:

```txt
1. O app deve permanecer em inglês.
2. Os relatórios devem ser gerados em inglês.
3. A documentação pode estar em português.
4. Não criar funcionalidades fora do escopo.
5. Não criar app nativo.
6. Não mudar a stack sem aprovação.
7. Não expor OpenAI API Key no frontend.
8. Não expor Supabase Service Role Key no frontend.
9. Não desativar RLS.
10. Não permitir Auditor ver auditorias de outros usuários.
11. Não permitir edição de auditoria Completed.
12. Fazer limpeza ao final de cada fase.
13. Validar estrutura/código ao final de cada fase.
14. Fazer validação visual apenas quando a fase alterar interface importante.
```

---

## 3. Tipos de Validação

### 3.1 Validação Estrutural

Deve acontecer em todas as fases.

O Copilot/agente deve verificar:

```txt
TypeScript sem erro.
Imports corretos.
Arquivos na pasta correta.
Nenhum componente duplicado.
Nenhum código morto óbvio.
Nenhuma função não usada importante.
Nenhuma variável de ambiente exposta indevidamente.
Rotas funcionando.
Build passando.
Lint passando quando configurado.
```

Comandos sugeridos:

```bash
npm run lint
npm run build
npm run typecheck
```

Se `typecheck` não existir, criar script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

---

### 3.2 Validação Funcional

Deve acontecer quando a fase implementar fluxo.

Exemplos:

```txt
Login funcionando.
Nova auditoria sendo criada.
Score calculando corretamente.
Foto sendo enviada.
IA gerando relatório.
PDF exportando.
```

---

### 3.3 Validação Visual

Não deve acontecer em todas as fases.

Fazer validação visual apenas quando a fase alterar:

```txt
Login screen
Dashboard
Checklist screen
Review screen
Report screen
Admin screens
PDF layout
PWA install experience
```

Validação visual deve ser simples:

```txt
Layout mobile correto.
Botões grandes.
Texto legível.
Sem overflow horizontal.
Cards alinhados.
Ações principais visíveis.
```

---

## 4. Regra de Limpeza Obrigatória

Toda fase deve terminar com uma subfase chamada:

```txt
Limpeza e consolidação
```

Essa subfase deve incluir:

```txt
Remover código duplicado.
Remover imports não usados.
Remover arquivos temporários.
Padronizar nomes.
Garantir que componentes criados estão sendo usados.
Garantir que não há console.log desnecessário.
Garantir que funções sensíveis estão no backend.
Rodar build/typecheck/lint.
Fazer commit.
```

---

# FASE 0 — Preparação do Ambiente

## Objetivo

Preparar o projeto para desenvolvimento controlado.

---

## 0.1 Confirmar documentação base

### Tarefas

```txt
Ler a Bíblia do App.
Ler o Documento de Engenharia.
Ler este Documento de Implementação.
Confirmar stack oficial.
Confirmar que o app será em inglês.
Confirmar que relatórios serão em inglês.
```

### Critério de pronto

```txt
Agente entende o escopo.
Agente não tenta adicionar features extras.
```

---

## 0.2 Criar plano de branch/commits

### Tarefas

```txt
Criar branch principal de desenvolvimento.
Definir padrão de commits.
Garantir que cada fase terá commit próprio.
```

### Padrão de commits

```txt
feat:
fix:
chore:
refactor:
docs:
test:
```

### Critério de pronto

```txt
Fluxo de versionamento definido.
```

---

## 0.3 Limpeza e consolidação

### Tarefas

```txt
Garantir que não há arquivos antigos conflitantes.
Garantir que não há documentação duplicada desnecessária.
Preparar pasta de docs.
```

### Validação estrutural

```txt
Estrutura inicial limpa.
```

### Commit sugerido

```txt
chore: prepare implementation documentation
```

---

# FASE 1 — Setup Inicial do Projeto

## Objetivo

Criar a base do projeto Next.js com TypeScript e Tailwind.

---

## 1.1 Criar projeto Next.js

### Tarefas

```txt
Criar projeto Next.js com App Router.
Ativar TypeScript.
Instalar Tailwind CSS.
Configurar ESLint.
Configurar estrutura inicial de pastas.
```

### Critério de pronto

```txt
Projeto roda localmente.
Página inicial abre sem erro.
```

---

## 1.2 Criar estrutura de pastas

### Tarefas

Criar:

```txt
components/
components/ui/
components/auth/
components/dashboard/
components/audit/
components/checklist/
components/report/
components/admin/

lib/
lib/supabase/
lib/scoring/
lib/ai/
lib/pdf/

types/
data/
supabase/
supabase/migrations/
supabase/policies/
public/icons/
docs/
```

### Critério de pronto

```txt
Estrutura preparada para crescimento.
Sem lógica implementada ainda.
```

---

## 1.3 Configurar scripts

### Tarefas

Adicionar scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

### Critério de pronto

```txt
npm run dev funciona.
npm run build funciona.
npm run typecheck funciona.
```

---

## 1.4 Limpeza e consolidação

### Tarefas

```txt
Remover arquivos boilerplate desnecessários.
Padronizar layout inicial.
Remover imports não usados.
Rodar lint/build/typecheck.
```

### Validação estrutural

```bash
npm run lint
npm run typecheck
npm run build
```

### Validação visual

Necessária apenas para confirmar que a página inicial não está quebrada.

### Commit sugerido

```txt
feat: initialize Next.js project structure
```

---

# FASE 2 — Configuração do Supabase

## Objetivo

Conectar o app ao Supabase de forma segura.

---

## 2.1 Configurar variáveis de ambiente

### Tarefas

Criar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Criar `.env.example` sem valores reais.

### Critério de pronto

```txt
Variáveis documentadas.
Nenhuma chave real commitada.
```

---

## 2.2 Criar clientes Supabase

### Tarefas

Criar:

```txt
lib/supabase/client.ts
lib/supabase/server.ts
```

### Regras

```txt
client.ts usa NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
server.ts pode usar contexto server-side.
Service role não deve ser usado no frontend.
```

### Critério de pronto

```txt
Supabase client criado.
Supabase server helper criado.
Nenhuma chave sensível no browser.
```

---

## 2.3 Criar tipos base

### Tarefas

Criar:

```txt
types/user.ts
types/audit.ts
types/report.ts
types/database.ts
```

### Critério de pronto

```txt
Tipos principais criados.
Sem dependência circular.
```

---

## 2.4 Limpeza e consolidação

### Tarefas

```txt
Verificar imports.
Verificar exposição de variáveis.
Remover código de teste.
Rodar lint/build/typecheck.
```

### Validação estrutural

```bash
npm run lint
npm run typecheck
npm run build
```

### Commit sugerido

```txt
feat: configure Supabase clients and environment
```

---

# FASE 3 — Banco de Dados e Segurança

## Objetivo

Criar schema SQL, tabelas, policies e seed inicial.

---

## 3.1 Criar migration do schema

### Tarefas

Criar migration com tabelas:

```txt
profiles
stores
audits
audit_questions
audit_answers
audit_photos
ai_reports
action_plans
action_plan_items
```

### Critério de pronto

```txt
Todas as tabelas existem.
Chaves primárias criadas.
Relacionamentos criados.
Checks básicos criados.
```

---

## 3.2 Criar funções auxiliares

### Tarefas

Criar função:

```sql
get_user_role(user_id uuid)
```

Opcional:

```sql
is_admin(user_id uuid)
```

### Critério de pronto

```txt
Funções disponíveis para RLS.
```

---

## 3.3 Criar RLS policies

### Tarefas

Ativar RLS em todas as tabelas principais.

Criar políticas:

```txt
Admin pode gerenciar tudo.
Auditor pode ler/criar/editar apenas próprias auditorias não finalizadas.
Auditor não pode ver auditorias de outros.
Auditor não pode editar auditoria Completed.
Audit answers seguem permissão da auditoria.
Audit photos seguem permissão da auditoria.
AI reports seguem permissão da auditoria.
Action plans seguem permissão da auditoria.
```

### Critério de pronto

```txt
RLS ativado.
Policies aplicadas.
Nenhuma tabela crítica pública.
```

---

## 3.4 Criar seed do checklist

### Tarefas

Criar seed para `audit_questions` com as seções:

```txt
Store Standards / Visual & Merchandising
Availability / Selection
Speed
Service & Customer Interaction
Scenario Question
Product Quality
Cleanliness & Facilities
Outstanding Service
Menu / Product Feedback
Information Only
```

### Critério de pronto

```txt
Perguntas inseridas em inglês.
Sort order correto.
Perguntas ativas.
```

---

## 3.5 Criar bucket de fotos

### Tarefas

Criar bucket:

```txt
audit-photos
```

Configurar policies para storage.

### Critério de pronto

```txt
Upload permitido para usuários autenticados.
Acesso respeita auditoria/role.
Admin pode acessar tudo.
```

---

## 3.6 Limpeza e consolidação

### Tarefas

```txt
Revisar SQL.
Remover policies duplicadas.
Garantir nomes consistentes.
Garantir que seed não duplica perguntas.
Rodar migrations em ambiente limpo.
```

### Validação estrutural

```txt
Migration executa sem erro.
Seed executa sem erro.
RLS não bloqueia admin.
RLS bloqueia auditor indevido.
```

### Commit sugerido

```txt
feat: add database schema, RLS policies and checklist seed
```

---

# FASE 4 — Autenticação

## Objetivo

Implementar login, logout e proteção básica de rotas.

---

## 4.1 Criar tela de login

### Tarefas

Criar rota:

```txt
/login
```

Criar componente:

```txt
LoginForm
```

Campos em inglês:

```txt
Email
Password
Sign In
Forgot Password
```

### Critério de pronto

```txt
Usuário consegue fazer login.
Erros aparecem em inglês.
```

---

## 4.2 Criar logout

### Tarefas

Criar ação de logout.
Adicionar botão em área privada.

Texto em inglês:

```txt
Sign Out
```

### Critério de pronto

```txt
Usuário consegue sair.
Sessão é encerrada.
```

---

## 4.3 Criar proteção de rotas

### Tarefas

Criar middleware para:

```txt
Usuário não logado → /login
Usuário logado acessando /login → /dashboard
```

### Critério de pronto

```txt
Rotas privadas protegidas.
Login não fica acessível para usuário já logado.
```

---

## 4.4 Limpeza e consolidação

### Tarefas

```txt
Remover estados duplicados de auth.
Consolidar helpers de sessão.
Remover console.log.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Login funciona.
Logout funciona.
Usuário sem login não acessa dashboard.
```

### Validação visual

Necessária para Login Screen.

### Commit sugerido

```txt
feat: add authentication flow
```

---

# FASE 5 — Profiles e Roles

## Objetivo

Implementar papéis Admin e Auditor.

---

## 5.1 Criar leitura do perfil

### Tarefas

Buscar profile do usuário logado.

Campos:

```txt
id
full_name
email
role
store_id
```

### Critério de pronto

```txt
App sabe o role do usuário.
```

---

## 5.2 Criar RoleGuard

### Tarefas

Criar componente/helper:

```txt
RoleGuard
```

Regras:

```txt
Admin acessa /admin.
Auditor não acessa /admin.
Auditor acessa /dashboard e /audits.
```

### Critério de pronto

```txt
RoleGuard bloqueia rotas corretamente.
```

---

## 5.3 Redirecionamento por role

### Tarefas

Após login:

```txt
Admin → /admin
Auditor → /dashboard
```

### Critério de pronto

```txt
Usuários caem no dashboard correto.
```

---

## 5.4 Limpeza e consolidação

### Tarefas

```txt
Remover lógica duplicada de role.
Centralizar tipos UserRole.
Verificar middleware.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Admin acessa admin.
Auditor não acessa admin.
Auditor acessa dashboard.
```

### Commit sugerido

```txt
feat: add role-based access control
```

---

# FASE 6 — Layout Base e Navegação

## Objetivo

Criar shell visual simples, mobile-first e consistente.

---

## 6.1 Criar AppShell

### Tarefas

Criar:

```txt
AppShell
MobileHeader
BottomNavigation ou TopNavigation simples
PageContainer
```

Textos em inglês.

### Critério de pronto

```txt
Rotas privadas têm layout consistente.
```

---

## 6.2 Criar componentes UI básicos

### Tarefas

Criar:

```txt
Button
Card
Input
Select
Textarea
Badge
LoadingState
EmptyState
ErrorMessage
```

### Critério de pronto

```txt
Componentes reutilizáveis existem.
Sem instalar UI library pesada.
```

---

## 6.3 Limpeza e consolidação

### Tarefas

```txt
Remover estilos duplicados.
Padronizar classes Tailwind.
Verificar responsividade básica.
Rodar lint/build/typecheck.
```

### Validação visual

Necessária porque altera layout global.

### Commit sugerido

```txt
feat: add mobile-first app shell and UI components
```

---

# FASE 7 — Dashboard do Auditor

## Objetivo

Criar dashboard inicial para Auditor.

---

## 7.1 Criar rota dashboard

### Tarefas

Criar:

```txt
/dashboard
```

Mostrar:

```txt
Start New Audit
In Progress Audits
Completed Audits
Average Score
Latest Report
```

### Critério de pronto

```txt
Auditor vê dashboard simples.
```

---

## 7.2 Buscar auditorias do usuário

### Tarefas

Buscar apenas auditorias do usuário logado.

Mostrar cards com:

```txt
Store
Date
Status
Score
Continue / Open Report
```

### Critério de pronto

```txt
Auditor vê apenas as próprias auditorias.
```

---

## 7.3 Limpeza e consolidação

### Tarefas

```txt
Remover dados mockados desnecessários.
Centralizar query de auditorias.
Garantir estado vazio.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Auditor vê suas auditorias.
Auditor não vê auditorias de outro usuário.
```

### Validação visual

Necessária para dashboard.

### Commit sugerido

```txt
feat: add auditor dashboard
```

---

# FASE 8 — Dashboard Admin Básico

## Objetivo

Criar dashboard inicial do Admin.

---

## 8.1 Criar rota admin

### Tarefas

Criar:

```txt
/admin
```

Mostrar métricas:

```txt
Total Audits
Average Score
Audits This Week
Open Action Plans
```

### Critério de pronto

```txt
Admin vê dashboard básico.
```

---

## 8.2 Criar lista de auditorias admin

### Tarefas

Criar tabela ou cards com:

```txt
Store
Auditor
Date
Score
Rating
Status
Actions
```

### Critério de pronto

```txt
Admin vê auditorias de todos.
```

---

## 8.3 Criar filtros básicos

### Tarefas

Adicionar filtros:

```txt
Store
Auditor
Status
Date Range
```

### Critério de pronto

```txt
Filtros funcionam em nível básico.
```

---

## 8.4 Limpeza e consolidação

### Tarefas

```txt
Remover queries duplicadas.
Centralizar componentes de tabela/card.
Garantir proteção admin.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Admin vê tudo.
Auditor não acessa /admin.
Filtros não quebram a tela.
```

### Validação visual

Necessária para dashboard admin.

### Commit sugerido

```txt
feat: add basic admin dashboard
```

---

# FASE 9 — Stores

## Objetivo

Permitir selecionar lojas em auditorias e gerenciar lojas de forma básica.

---

## 9.1 Criar seed/store inicial

### Tarefas

Criar pelo menos uma loja inicial.

Campos:

```txt
name
location
area
active
```

### Critério de pronto

```txt
Existe loja ativa para selecionar.
```

---

## 9.2 Criar listagem admin de lojas

### Tarefas

Criar rota:

```txt
/admin/stores
```

Mostrar:

```txt
Name
Location
Area
Active
```

### Critério de pronto

```txt
Admin consegue ver lojas.
```

---

## 9.3 Criar criação simples de loja

### Tarefas

Formulário simples:

```txt
Store Name
Location
Area
Active
```

### Critério de pronto

```txt
Admin consegue criar loja.
```

---

## 9.4 Limpeza e consolidação

### Tarefas

```txt
Remover stores mockadas.
Garantir selects usando dados reais.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Loja criada aparece na lista.
Loja ativa aparece no formulário de auditoria futuramente.
```

### Commit sugerido

```txt
feat: add store management basics
```

---

# FASE 10 — Criar Nova Auditoria

## Objetivo

Permitir que Auditor crie uma auditoria em Draft.

---

## 10.1 Criar rota new audit

### Tarefas

Criar:

```txt
/audits/new
```

Campos em inglês:

```txt
Store
Visit Date
Visit Time
MOD / Manager on Duty
Shift
Traffic Level
Visit Type
Initial Notes
```

### Critério de pronto

```txt
Tela abre.
Campos aparecem.
```

---

## 10.2 Salvar auditoria

### Tarefas

Ao enviar:

```txt
Criar registro em audits.
status = Draft
auditor_id = usuário logado
```

### Critério de pronto

```txt
Auditoria salva no Supabase.
Usuário é redirecionado para checklist.
```

---

## 10.3 Validações

### Tarefas

Obrigatórios:

```txt
Store
Visit Date
Visit Time
Shift
Traffic Level
Visit Type
```

### Critério de pronto

```txt
Formulário bloqueia envio incompleto.
Mensagens em inglês.
```

---

## 10.4 Limpeza e consolidação

### Tarefas

```txt
Remover código mock.
Centralizar tipos de shift/traffic/visit_type.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Auditoria criada corretamente.
Auditor não consegue criar auditoria para outro auditor.
```

### Validação visual

Necessária para New Audit Screen.

### Commit sugerido

```txt
feat: add new audit creation flow
```

---

# FASE 11 — Checklist Engine

## Objetivo

Carregar perguntas do banco e permitir respostas.

---

## 11.1 Criar rota checklist

### Tarefas

Criar:

```txt
/audits/[id]/checklist
```

Buscar:

```txt
audit
audit_questions
audit_answers existentes
```

### Critério de pronto

```txt
Checklist abre para auditoria válida.
```

---

## 11.2 Criar seções

### Tarefas

Agrupar perguntas por `section_name`.

Mostrar uma seção por vez.

### Critério de pronto

```txt
Perguntas aparecem agrupadas.
Usuário consegue navegar entre seções.
```

---

## 11.3 Criar resposta de pergunta

### Tarefas

Criar componentes:

```txt
ChecklistSection
ChecklistQuestion
ScoreSelector
CommentBox
CriticalIssueToggle
```

### Critério de pronto

```txt
Usuário consegue escolher score e escrever comentário.
```

---

## 11.4 Salvar respostas

### Tarefas

Salvar em `audit_answers`.

Usar snapshot:

```txt
question_text_snapshot
section_name
max_score
```

### Critério de pronto

```txt
Respostas persistem após recarregar a página.
```

---

## 11.5 Limpeza e consolidação

### Tarefas

```txt
Remover estados duplicados.
Evitar recriar respostas duplicadas.
Garantir ordenação das perguntas.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Resposta salva.
Resposta recarrega.
N/A funciona.
Comentário salva.
```

### Validação visual

Necessária para checklist.

### Commit sugerido

```txt
feat: add checklist engine and answer persistence
```

---

# FASE 12 — Scoring Engine

## Objetivo

Calcular score total e por seção de forma confiável.

---

## 12.1 Criar função calculateScore

### Tarefas

Criar:

```txt
lib/scoring/calculateScore.ts
```

Implementar:

```txt
Total Score
Max Score
Percentage
Rating
Section Breakdown
```

### Critério de pronto

```txt
Função isolada calcula score corretamente.
```

---

## 12.2 Integrar no checklist

### Tarefas

Mostrar score parcial:

```txt
Current Score
Section Score
Progress
```

### Critério de pronto

```txt
Score atualiza conforme respostas.
```

---

## 12.3 Integrar no banco

### Tarefas

Ao salvar/finalizar, atualizar:

```txt
total_score
max_score
percentage
final_rating
```

### Critério de pronto

```txt
Score fica salvo na auditoria.
```

---

## 12.4 Limpeza e consolidação

### Tarefas

```txt
Remover cálculos duplicados.
Garantir que N/A não conta.
Criar testes manuais/documentados para casos básicos.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
0/5 calcula.
5/5 calcula.
N/A ignora.
Rating correto.
```

### Commit sugerido

```txt
feat: add scoring engine
```

---

# FASE 13 — Upload de Fotos

## Objetivo

Permitir foto por pergunta/resposta.

---

## 13.1 Criar PhotoUploader

### Tarefas

Criar componente:

```txt
PhotoUploader
```

Input:

```html
<input type="file" accept="image/*" capture="environment" />
```

### Critério de pronto

```txt
Usuário consegue selecionar/tirar foto.
Preview aparece.
```

---

## 13.2 Upload para Supabase Storage

### Tarefas

Salvar em:

```txt
audit-photos/{audit_id}/{answer_id}/{timestamp}-{filename}
```

Criar registro em `audit_photos`.

### Critério de pronto

```txt
Foto aparece no Supabase Storage.
Registro aparece em audit_photos.
```

---

## 13.3 Adicionar legenda

### Tarefas

Campo:

```txt
Caption
```

### Critério de pronto

```txt
Legenda salva com a foto.
```

---

## 13.4 Remover foto

### Tarefas

Permitir remover foto antes da auditoria ser finalizada.

### Critério de pronto

```txt
Foto removida da UI.
Registro removido.
Arquivo removido quando possível.
```

---

## 13.5 Limpeza e consolidação

### Tarefas

```txt
Remover previews órfãos.
Garantir que upload não duplica.
Tratar erro de upload.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Foto envia.
Foto aparece após reload.
Legenda salva.
Auditor não acessa foto de auditoria alheia.
```

### Validação visual

Necessária para PhotoUploader no checklist.

### Commit sugerido

```txt
feat: add photo upload for audit answers
```

---

# FASE 14 — Review e Finalização da Auditoria

## Objetivo

Permitir revisão, validação e conclusão da auditoria.

---

## 14.1 Criar review screen

### Tarefas

Criar:

```txt
/audits/[id]/review
```

Mostrar:

```txt
Audit Summary
Score Overview
Section Breakdown
Missing Required Questions
Critical Issues
Photos Attached
```

### Critério de pronto

```txt
Tela de revisão mostra dados corretos.
```

---

## 14.2 Criar validação de conclusão

### Tarefas

Bloquear se:

```txt
Perguntas obrigatórias sem resposta.
Perguntas críticas sem resposta.
Score inconsistente.
Usuário sem permissão.
Auditoria já Completed.
```

### Critério de pronto

```txt
Usuário não finaliza auditoria incompleta.
```

---

## 14.3 Complete Audit

### Tarefas

Ao clicar:

```txt
Recalcular score.
Salvar score.
Mudar status para Completed.
Salvar completed_at.
Bloquear edição.
```

### Critério de pronto

```txt
Auditoria finalizada corretamente.
```

---

## 14.4 Limpeza e consolidação

### Tarefas

```txt
Remover validações duplicadas.
Garantir mensagens em inglês.
Garantir bloqueio pós-completion.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Auditoria completa finaliza.
Auditoria incompleta bloqueia.
Completed não edita.
```

### Validação visual

Necessária para Review Screen.

### Commit sugerido

```txt
feat: add audit review and completion flow
```

---

# FASE 15 — Relatório Final sem IA

## Objetivo

Criar relatório final com dados reais antes da IA.

---

## 15.1 Criar report screen

### Tarefas

Criar:

```txt
/audits/[id]/report
```

Mostrar:

```txt
Store Audit Report
Audit Summary
Score Overview
Category Breakdown
Photo Evidence
```

### Critério de pronto

```txt
Relatório abre para auditoria finalizada.
```

---

## 15.2 Criar breakdown por seção

### Tarefas

Mostrar:

```txt
Category
Score
Max Score
Percentage
Status
```

### Critério de pronto

```txt
Score por categoria visível.
```

---

## 15.3 Mostrar fotos

### Tarefas

Agrupar fotos por:

```txt
Section Name
Question
Caption
```

### Critério de pronto

```txt
Fotos aparecem no relatório.
```

---

## 15.4 Estado sem IA

### Tarefas

Mostrar:

```txt
AI Action Plan has not been generated yet.
Generate AI Action Plan
```

### Critério de pronto

```txt
Usuário entende que IA ainda não foi gerada.
```

---

## 15.5 Limpeza e consolidação

### Tarefas

```txt
Remover componentes duplicados de score.
Garantir layout mobile.
Garantir permissões.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Relatório abre.
Dados batem com auditoria.
Fotos aparecem.
Auditor não abre relatório alheio.
```

### Validação visual

Necessária para Report Screen.

### Commit sugerido

```txt
feat: add final report without AI
```

---

# FASE 16 — Integração com IA

## Objetivo

Gerar relatório e plano de ação com OpenAI API.

---

## 16.1 Criar API route

### Tarefas

Criar:

```txt
app/api/ai/generate-report/route.ts
```

Entrada:

```json
{
  "auditId": "uuid"
}
```

### Critério de pronto

```txt
API route criada.
Valida auditId.
```

---

## 16.2 Buscar dados completos

### Tarefas

Buscar:

```txt
audit
store
auditor
answers
photos captions
section scores
```

### Critério de pronto

```txt
Payload da IA contém dados reais e suficientes.
```

---

## 16.3 Criar prompt builder

### Tarefas

Criar:

```txt
lib/ai/buildAuditPrompt.ts
```

Prompt deve exigir:

```txt
Relatório em inglês.
JSON estruturado.
Não inventar fatos.
Plano de ação com Action, Owner, Priority, Due Date, Success Measure.
```

### Critério de pronto

```txt
Prompt consistente.
Dados inseridos corretamente.
```

---

## 16.4 Chamar OpenAI

### Tarefas

Chamar OpenAI apenas no backend.

### Critério de pronto

```txt
Resposta da IA retorna JSON.
Chave não aparece no frontend.
```

---

## 16.5 Salvar AI report

### Tarefas

Salvar em:

```txt
ai_reports
action_plans
action_plan_items
```

Atualizar status:

```txt
AI Report Generated
```

ou

```txt
Action Plan Open
```

### Critério de pronto

```txt
Relatório salvo.
Plano de ação salvo.
```

---

## 16.6 Mostrar IA no relatório

### Tarefas

Exibir:

```txt
Executive Summary
What Went Well
What Needs Improvement
Priority Focus
Action Plan
Coaching Notes
Message to the Team
Follow-up Recommendations
```

### Critério de pronto

```txt
Relatório final mostra conteúdo da IA.
```

---

## 16.7 Limpeza e consolidação

### Tarefas

```txt
Remover logs da resposta da IA.
Tratar erro de JSON inválido.
Garantir que IA não roda sem permissão.
Garantir que frontend não tem chave.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
IA gera relatório.
IA salva relatório.
Auditor não gera IA para auditoria de outro usuário.
Admin gera IA para qualquer auditoria.
```

### Commit sugerido

```txt
feat: add AI action plan generation
```

---

# FASE 17 — Action Plan

## Objetivo

Exibir e acompanhar o plano de ação gerado.

---

## 17.1 Criar ActionPlanList

### Tarefas

Mostrar itens:

```txt
Action
Owner
Priority
Due Date
Success Measure
Status
```

### Critério de pronto

```txt
Itens aparecem no relatório.
```

---

## 17.2 Atualizar status do item

### Tarefas

Permitir alterar:

```txt
Open
In Progress
Completed
Cancelled
```

Na primeira versão, permitir apenas para Admin.

### Critério de pronto

```txt
Admin consegue atualizar status.
Auditor apenas visualiza.
```

---

## 17.3 Criar página action-plan

### Tarefas

Criar:

```txt
/audits/[id]/action-plan
```

### Critério de pronto

```txt
Plano de ação tem tela dedicada.
```

---

## 17.4 Limpeza e consolidação

### Tarefas

```txt
Remover lógica duplicada do relatório.
Garantir permissões.
Padronizar badges de status.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Action plan abre.
Admin atualiza status.
Auditor não atualiza status indevidamente.
```

### Commit sugerido

```txt
feat: add action plan tracking
```

---

# FASE 18 — Exportação em PDF

## Objetivo

Permitir exportar relatório final em PDF.

---

## 18.1 Escolher estratégia MVP

### Tarefas

Usar uma das opções:

```txt
html2pdf.js
jsPDF
react-to-print + print as PDF
```

Recomendado para MVP:

```txt
react-to-print ou html2pdf.js
```

### Critério de pronto

```txt
Estratégia escolhida e implementada sem backend pesado.
```

---

## 18.2 Criar botão export

### Tarefas

Criar:

```txt
PdfExportButton
```

Texto em inglês:

```txt
Export PDF
```

### Critério de pronto

```txt
Botão aparece no relatório.
```

---

## 18.3 Criar layout print-friendly

### Tarefas

Garantir que PDF inclua:

```txt
Audit Summary
Score Overview
Category Breakdown
What Went Well
What Needs Improvement
AI Action Plan
Photo Evidence
Follow-up Actions
```

### Critério de pronto

```txt
PDF contém as seções principais.
```

---

## 18.4 Limpeza e consolidação

### Tarefas

```txt
Remover estilos que quebram impressão.
Garantir imagens dimensionadas.
Garantir texto em inglês.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
PDF exporta.
PDF contém score.
PDF contém IA quando disponível.
PDF contém fotos quando disponíveis.
```

### Validação visual

Necessária para PDF.

### Commit sugerido

```txt
feat: add PDF export
```

---

# FASE 19 — PWA

## Objetivo

Transformar o app em PWA instalável.

---

## 19.1 Criar manifest

### Tarefas

Criar:

```txt
public/manifest.json
```

Conteúdo base:

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

### Critério de pronto

```txt
Manifest válido.
```

---

## 19.2 Adicionar ícones

### Tarefas

Adicionar:

```txt
public/icons/icon-192.png
public/icons/icon-512.png
```

### Critério de pronto

```txt
Ícones carregam no manifest.
```

---

## 19.3 Configurar service worker

### Tarefas

Configurar PWA básico.

Regras:

```txt
Offline completo não é obrigatório.
Cache simples de assets é suficiente.
Não cachear dados sensíveis indevidamente.
```

### Critério de pronto

```txt
App é instalável.
Não quebra login.
```

---

## 19.4 Limpeza e consolidação

### Tarefas

```txt
Verificar manifest.
Verificar ícones.
Garantir que PWA não cacheia dados errados.
Rodar build.
```

### Validação funcional

```txt
App instala no celular.
App abre em modo standalone.
Login continua funcionando.
```

### Validação visual

Necessária para experiência de instalação/abertura.

### Commit sugerido

```txt
feat: configure PWA installation
```

---

# FASE 20 — Admin Users Básico

## Objetivo

Permitir Admin visualizar usuários e seus papéis.

---

## 20.1 Criar rota users

### Tarefas

Criar:

```txt
/admin/users
```

Mostrar:

```txt
Full Name
Email
Role
Store
Created At
```

### Critério de pronto

```txt
Admin vê usuários.
```

---

## 20.2 Alteração simples de role

### Tarefas

Permitir Admin alterar:

```txt
admin
auditor
manager
```

Opcional na primeira entrega, mas recomendado.

### Critério de pronto

```txt
Role pode ser atualizado com segurança.
```

---

## 20.3 Limpeza e consolidação

### Tarefas

```txt
Garantir que Auditor não acessa users.
Evitar self-demotion acidental de único Admin, se possível.
Rodar lint/build/typecheck.
```

### Validação funcional

```txt
Admin vê users.
Auditor não vê users.
Role atualiza.
```

### Commit sugerido

```txt
feat: add basic admin user management
```

---

# FASE 21 — Refinamento Mobile

## Objetivo

Melhorar usabilidade no celular após os fluxos existirem.

---

## 21.1 Revisar toque e espaçamento

### Tarefas

```txt
Aumentar botões pequenos.
Ajustar cards.
Evitar overflow horizontal.
Garantir inputs legíveis.
Garantir sticky actions quando útil.
```

### Critério de pronto

```txt
App confortável para uso andando pela loja.
```

---

## 21.2 Revisar checklist mobile

### Tarefas

```txt
Score buttons fáceis de tocar.
Next Section visível.
Save Draft visível.
Photo upload claro.
Comentários fáceis de escrever.
```

### Critério de pronto

```txt
Checklist usável no celular.
```

---

## 21.3 Revisar relatório mobile

### Tarefas

```txt
Score legível.
Fotos bem dimensionadas.
Action plan legível.
PDF button visível.
```

### Critério de pronto

```txt
Relatório legível no celular.
```

---

## 21.4 Limpeza e consolidação

### Tarefas

```txt
Remover classes Tailwind duplicadas.
Centralizar estilos comuns.
Rodar lint/build/typecheck.
```

### Validação visual

Necessária.

### Commit sugerido

```txt
fix: improve mobile usability
```

---

# FASE 22 — Segurança e RLS Final

## Objetivo

Auditar permissões antes de considerar o app pronto.

---

## 22.1 Testar Admin

### Tarefas

Confirmar:

```txt
Admin vê todas auditorias.
Admin vê todos relatórios.
Admin vê todas fotos.
Admin acessa /admin.
```

### Critério de pronto

```txt
Admin funciona corretamente.
```

---

## 22.2 Testar Auditor

### Tarefas

Confirmar:

```txt
Auditor vê apenas próprias auditorias.
Auditor não acessa /admin.
Auditor não edita Completed.
Auditor não acessa fotos de outros.
Auditor não gera IA para auditoria de outro usuário.
```

### Critério de pronto

```txt
Auditor isolado corretamente.
```

---

## 22.3 Testar chaves

### Tarefas

Confirmar:

```txt
OPENAI_API_KEY não aparece no bundle.
SUPABASE_SERVICE_ROLE_KEY não aparece no bundle.
Nenhuma chave real em commit.
```

### Critério de pronto

```txt
Chaves protegidas.
```

---

## 22.4 Limpeza e consolidação

### Tarefas

```txt
Corrigir policies.
Remover bypasses temporários.
Remover logs sensíveis.
Rodar lint/build/typecheck.
```

### Validação funcional

Obrigatória.

### Commit sugerido

```txt
fix: harden security and RLS policies
```

---

# FASE 23 — Teste Final End-to-End

## Objetivo

Testar o app como usuário real.

---

## 23.1 Fluxo Auditor completo

### Tarefas

Executar:

```txt
Login como Auditor.
Criar auditoria.
Preencher checklist.
Adicionar comentários.
Adicionar fotos.
Revisar.
Finalizar.
Gerar IA.
Abrir relatório.
Exportar PDF.
```

### Critério de pronto

```txt
Fluxo completo funciona sem intervenção técnica.
```

---

## 23.2 Fluxo Admin completo

### Tarefas

Executar:

```txt
Login como Admin.
Abrir Admin Dashboard.
Filtrar auditorias.
Abrir auditoria de outro usuário.
Ver relatório.
Gerar/regenerar IA.
Exportar PDF.
```

### Critério de pronto

```txt
Admin controla auditorias corretamente.
```

---

## 23.3 Fluxo PWA

### Tarefas

Executar no celular:

```txt
Abrir app no navegador.
Instalar PWA.
Login.
Abrir dashboard.
Criar auditoria teste.
Tirar foto.
Salvar.
```

### Critério de pronto

```txt
PWA funciona no celular.
```

---

## 23.4 Limpeza e consolidação

### Tarefas

```txt
Corrigir bugs encontrados.
Remover dados de teste se necessário.
Remover logs.
Garantir build final.
```

### Validação visual

Necessária apenas nas telas principais testadas no celular.

### Commit sugerido

```txt
test: complete end-to-end app validation
```

---

# FASE 24 — Polish Final e Entrega

## Objetivo

Preparar o app para uso real.

---

## 24.1 Revisar textos em inglês

### Tarefas

Confirmar que todas as telas estão em inglês:

```txt
Login
Dashboard
Admin
New Audit
Checklist
Review
Report
Action Plan
PDF
Errors
Empty states
Buttons
```

### Critério de pronto

```txt
Nenhum texto em português na interface.
```

---

## 24.2 Revisar estados vazios e erros

### Tarefas

Garantir mensagens claras:

```txt
No audits found.
No photos uploaded.
AI Action Plan has not been generated yet.
You do not have permission to view this audit.
Please complete all required questions before finishing the audit.
```

### Critério de pronto

```txt
Usuário nunca vê tela quebrada ou vazia sem explicação.
```

---

## 24.3 Revisar README

### Tarefas

Criar README com:

```txt
Project overview
Stack
Environment variables
Setup
Supabase setup
Run locally
Build
Deployment notes
```

### Critério de pronto

```txt
Outro agente/desenvolvedor consegue rodar o projeto.
```

---

## 24.4 Limpeza e consolidação

### Tarefas

```txt
Remover arquivos temporários.
Remover mocks desnecessários.
Remover dados falsos hardcoded.
Rodar lint.
Rodar typecheck.
Rodar build.
Revisar warnings.
Criar commit final.
```

### Validação estrutural final

```bash
npm run lint
npm run typecheck
npm run build
```

### Commit sugerido

```txt
chore: finalize first release
```

---

# 25. Checklist Final de Entrega

Antes de considerar pronto, confirmar:

```txt
[ ] App em inglês.
[ ] Relatórios em inglês.
[ ] Login funcionando.
[ ] Admin role funcionando.
[ ] Auditor role funcionando.
[ ] Admin vê todas auditorias.
[ ] Auditor vê apenas próprias auditorias.
[ ] Nova auditoria funciona.
[ ] Checklist funciona.
[ ] Comentários salvam.
[ ] Fotos salvam.
[ ] Score calcula corretamente.
[ ] Review bloqueia auditoria incompleta.
[ ] Completed bloqueia edição.
[ ] Relatório final funciona.
[ ] IA gera relatório.
[ ] IA não inventa dados.
[ ] Action plan salva.
[ ] PDF exporta.
[ ] PWA instala.
[ ] RLS ativa.
[ ] Chaves protegidas.
[ ] Build final passa.
```

---

# 26. Prompt Mestre para o Agente de IA

Usar este prompt antes de iniciar a implementação:

```txt
You are implementing the Store Audit Trainer app.

Read and follow the project documentation:
1. App Bible
2. Engineering Document
3. Implementation Phases Document

The app must be a mobile-first PWA built with:
Next.js, TypeScript, Tailwind CSS, Supabase Auth, Supabase Database, Supabase Storage and OpenAI API.

The app interface must be in English.
All generated reports must be in English.
The documentation can be in Portuguese.

Implement the project phase by phase.
Do not skip phases.
Do not add features outside the approved scope.
Do not expose API keys in frontend code.
Do not disable Supabase RLS.
Do not allow Auditors to see audits from other users.
Do not allow Completed audits to be edited.

At the end of each phase:
1. Clean duplicated or temporary code.
2. Remove unused imports.
3. Remove unnecessary console logs.
4. Run lint, typecheck and build.
5. Summarize what was completed.
6. List any issue found.
7. Create a commit.

Visual validation is required only when a phase changes important UI screens.
Structural validation is required in every phase.
```

---

# 27. Definição Final

Este documento deve ser seguido como um roteiro de execução.

A prioridade é construir o app de forma:

```txt
simples
segura
organizada
mobile-first
validável
sem excesso de escopo
```

A implementação deve avançar em pequenas partes, sempre com limpeza, validação estrutural e commit ao final de cada fase.
