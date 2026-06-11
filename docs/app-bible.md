# Store Audit Trainer — Bíblia do App

> **Idioma da documentação:** Português  
> **Idioma do aplicativo:** Inglês  
> **Idioma dos relatórios:** Inglês  
> **Tipo de app:** PWA mobile-first com login, Admin, Auditor, fotos, score, relatórios e IA integrada.

---

## 1. Visão do Produto

**Store Audit Trainer** é um PWA mobile-first criado para ajudar líderes de loja a realizar auditorias internas de treinamento, coletar evidências com fotos, calcular pontuação de performance e gerar relatórios profissionais em inglês com plano de ação gerado por IA.

O app deve simular uma visita no estilo **Mystery Shop**. O auditor anda pela loja, responde perguntas estruturadas, adiciona comentários, tira fotos e gera um relatório final.

O relatório final deve ajudar managers e líderes a treinar a equipe com ações claras, práticas e mensuráveis.

O app não deve ser tratado como um sistema corporativo complexo. Ele deve ser simples, rápido, confiável e fácil de usar durante uma caminhada real pela loja.

---

## 2. Objetivo Principal

O app existe para responder a uma pergunta:

> **Is the store ready to deliver a strong customer experience today?**

O app deve avaliar:

- Apresentação da loja
- Disponibilidade de produtos
- Velocidade de atendimento
- Interação com o cliente
- Qualidade dos produtos
- Limpeza
- Resposta a perguntas de cenário
- Atendimento excepcional
- Feedback de menu/produto

O app deve identificar:

- **What Went Well**
- **What Needs Improvement**
- **Priority Focus**
- **Action Plan**

Essas seções devem aparecer em inglês no aplicativo e no relatório final.

---

## 3. Idioma do App

Todo o aplicativo deve ser em **inglês**.

Isso inclui:

- Navegação
- Botões
- Labels
- Perguntas do checklist
- Pontuação
- Relatórios
- Planos de ação gerados por IA
- PDF exportado
- Cards do dashboard
- Painel Admin
- Status da auditoria

Nenhum texto em português deve aparecer na interface do app ou nos relatórios gerados.

---

## 4. Tipo de Aplicativo

O app deve ser criado como **PWA — Progressive Web App**.

Ele deve:

- Rodar no navegador do celular
- Ser instalável na tela inicial do celular
- Permitir upload/captura de fotos pela câmera
- Funcionar bem em Android e iPhone
- Ser responsivo
- Ser rápido durante o uso dentro da loja
- Não depender de publicação na App Store ou Play Store

---

## 5. Stack Técnica Recomendada

Stack final recomendada:

```txt
Next.js
TypeScript
Tailwind CSS
Supabase Auth
Supabase Database
Supabase Storage
OpenAI API
PWA
PDF Export
```

### Motivos da escolha

**Next.js**  
Fornece uma estrutura forte para frontend, backend/API routes e crescimento futuro.

**TypeScript**  
Reduz bugs em regras de score, permissões e modelos de banco de dados.

**Tailwind CSS**  
Permite criar uma interface limpa, rápida e mobile-first.

**Supabase Auth**  
Cuida do login e autenticação dos usuários.

**Supabase Database**  
Armazena auditorias, usuários, permissões, lojas, respostas, relatórios e planos de ação.

**Supabase Storage**  
Armazena as fotos usadas como evidência.

**OpenAI API**  
Gera relatórios finais, resumos profissionais e planos de ação.

**PWA**  
Permite que o app funcione como aplicativo no celular sem depender das lojas oficiais.

---

## 6. Papéis de Usuário

O app deve ter controle de acesso por função.

### 6.1 Admin

O Admin pode:

- Ver auditorias de todos os usuários
- Ver todas as lojas
- Ver todos os auditores
- Criar e gerenciar lojas
- Ver dashboard analítico
- Filtrar auditorias por loja, data, auditor e score
- Abrir qualquer relatório final
- Gerar ou regenerar planos de ação por IA
- Exportar relatórios
- Gerenciar usuários
- Atribuir papéis aos usuários

### 6.2 Auditor

O Auditor pode:

- Criar novas auditorias
- Continuar auditorias incompletas
- Adicionar notas e fotos
- Finalizar auditorias
- Gerar relatório com IA das próprias auditorias
- Ver apenas as próprias auditorias
- Exportar os próprios relatórios

### 6.3 Manager — Papel Futuro

O papel de Manager pode ser adicionado depois.

O Manager poderá:

- Ver auditorias da loja atribuída a ele
- Acompanhar planos de ação
- Marcar ações como concluídas
- Comentar nos follow-ups

Esse papel não é obrigatório na primeira versão, mas o banco de dados deve estar preparado para adicioná-lo depois.

---

## 7. Regras de Autenticação

O app deve exigir login.

Não deve existir acesso público às auditorias.

Modelo recomendado:

- Usuários são criados ou aprovados pelo Admin
- Não deve haver cadastro público livre na primeira versão
- Login com e-mail e senha
- Recuperação de senha disponível
- Todo usuário deve ter um perfil com role e, se necessário, loja atribuída

---

## 8. Regras de Permissão

As permissões devem ser aplicadas no banco de dados, não apenas no frontend.

Usar **Supabase Row Level Security**.

### Admin

```txt
Can read and manage all records.
```

### Auditor

```txt
Can create audits.
Can read only their own audits.
Can update only their own draft or in-progress audits.
Cannot edit completed audits unless reopened by Admin.
Cannot see other users’ audits.
```

### Manager

```txt
Can read audits from assigned store only.
Can update action plan status only.
Cannot edit audit answers.
```

---

## 9. Fluxo Principal do Usuário

```txt
Login
↓
Dashboard
↓
Start New Audit
↓
Enter Audit Details
↓
Complete Checklist Sections
↓
Add Scores, Comments and Photos
↓
Review Audit
↓
Complete Audit
↓
Generate AI Action Plan
↓
View Final Report
↓
Export / Share Report
```

---

## 10. Telas Principais

### 10.1 Login Screen

Campos:

- Email
- Password

Ações:

- Sign In
- Forgot Password

A tela de login deve ser limpa, profissional e direta.

---

### 10.2 Auditor Dashboard

O dashboard do auditor deve mostrar:

- Botão **Start New Audit**
- Auditorias em andamento
- Auditorias finalizadas
- Resumo de score
- Relatórios recentes

Campos do card de auditoria:

```txt
Store Name
Date
Score
Status
Audit Status
Open Report
```

---

### 10.3 Admin Dashboard

O dashboard do Admin deve mostrar:

- Total de auditorias
- Média geral de score
- Média por loja
- Últimas auditorias
- Categorias com menor pontuação
- Problemas mais comuns
- Filtro por auditoria
- Filtro por usuário
- Filtro por loja
- Filtro por data

Exemplo de insights:

```txt
Average Score: 84%
Lowest Category: Service
Most Common Issue: No greeting / no smile / no eye contact
Best Category: Cleanliness
```

---

### 10.4 New Audit Screen

Campos:

```txt
Store
Visit Date
Visit Time
Auditor
MOD / Manager on Duty
Shift
Traffic Level
Visit Type
Initial Notes
```

Opções:

```txt
Shift:
Morning
Afternoon
Evening

Traffic Level:
Low
Medium
High

Visit Type:
Training Audit
Follow-up Audit
Mystery Shop Simulation
```

---

### 10.5 Checklist Screen

O checklist deve ser dividido em seções simples.

Cada pergunta deve permitir:

- Score
- Comment
- Photo upload
- Critical issue flag quando aplicável

Componente de pergunta:

```txt
Question Title
Question Description
Score Selector
Comment Field
Add Photo Button
Photo Preview
Critical Issue Toggle
```

---

### 10.6 Review Screen

Antes de completar a auditoria, o usuário deve ver:

- Total score
- Score por seção
- Perguntas críticas não respondidas
- Campos obrigatórios faltando
- Fotos anexadas
- Resumo de comentários

O usuário deve poder voltar e editar antes de finalizar.

---

### 10.7 Final Report Screen

O relatório final deve incluir:

```txt
Audit Summary
Score Breakdown
What Went Well
What Needs Improvement
AI Action Plan
Photo Evidence
Follow-up Actions
```

---

### 10.8 Admin Audit Detail Screen

O Admin pode abrir qualquer auditoria e visualizar:

- Nome do auditor
- Loja
- Data
- Horário
- Score
- Respostas
- Fotos
- Comentários
- Relatório da IA
- Plano de ação
- Exportação em PDF

---

## 11. Estrutura do Checklist

O checklist final deve seguir categorias no estilo Mystery Shop.

---

### 11.1 Store Standards / Visual & Merchandising

Objetivo: avaliar apresentação visual e padrões de merchandising.

Perguntas em inglês no app:

```txt
1. Was the shop entrance clean, tidy and well presented?
2. Were the main fridge displays neat, full and front-facing?
3. Were hot food displays well presented and clearly labelled?
4. Were snacks and bakery displays tidy and well stocked?
5. Were all labels and price tickets visible and correctly positioned?
6. Were products aligned and easy for customers to shop?
```

---

### 11.2 Availability / Selection

Objetivo: avaliar disponibilidade dos produtos principais.

Perguntas em inglês no app:

```txt
1. Did every cold food price ticket have at least one product available?
2. Did every hot food price ticket have at least one product available?
3. Were snacks and bottled drinks available?
4. Was the bakery selection appropriate for the time of day?
5. Were missing or low products communicated to the MOD?
6. Was the team actively maintaining availability?
```

---

### 11.3 Speed

Objetivo: avaliar fluxo de clientes e velocidade do atendimento.

Perguntas em inglês no app:

```txt
1. Was the queue time within the 60-second target?
2. Was the barista-prepared drink time within the 60-second target?
3. Were customers being prioritised?
4. Was the till area operating efficiently?
5. Was the barista area operating efficiently?
6. Were there visible bottlenecks affecting the customer experience?
```

Campos extras:

```txt
Queue Time in Seconds
Barista Drink Time in Seconds
Number of Customers Ahead
Observed Bottleneck
```

---

### 11.4 Service & Customer Interaction

Objetivo: avaliar o comportamento da equipe no atendimento ao cliente.

Perguntas em inglês no app:

```txt
1. Did the team member greet the customer?
2. Did the team member smile?
3. Did the team member make eye contact?
4. Was the tone of voice friendly and natural?
5. Did the team member give a pleasant parting comment?
6. Was the customer acknowledged when the drink was handed over?
7. Did the team member offer to size up the drink where applicable?
8. Did the team member ask eat in or takeaway where applicable?
9. Did any team member deliver exceptional service?
```

Essa seção é crítica e deve influenciar fortemente o plano de ação.

---

### 11.5 Scenario Question

Objetivo: testar conhecimento, simpatia e engajamento.

Opções de cenário em inglês no app:

```txt
Opening hours
Alternative milk
Allergen question
Toilet location
Wi-Fi availability
Product recommendation
```

Perguntas em inglês no app:

```txt
1. Was the team member knowledgeable?
2. Was the answer clear and helpful?
3. Was the team member friendly?
4. Did the team member engage naturally with the customer?
5. Did the answer improve the customer experience?
```

---

### 11.6 Product Quality

Objetivo: avaliar qualidade de comida e bebida.

Perguntas em inglês no app:

```txt
1. Was the food item presented correctly?
2. Was the food item served at the correct temperature?
3. Was the product easy to eat?
4. Was the filling or ingredient distribution correct?
5. Was the barista-prepared drink well presented?
6. Was the barista-prepared drink of expected quality?
```

---

### 11.7 Cleanliness & Facilities

Objetivo: avaliar limpeza e áreas de uso do cliente.

Perguntas em inglês no app:

```txt
1. Were the floors clean and tidy?
2. Were tables and seating areas clean?
3. Was the bin station clean and tidy?
4. Were cutlery, sugars and customer-use items well stocked?
5. Was the till area clean?
6. Was the drink handoff area clean?
7. Was the overall shop environment well maintained?
```

---

### 11.8 Outstanding Service

Objetivo: identificar atendimento excepcional.

Perguntas em inglês no app:

```txt
1. Did any team member go above and beyond?
2. Would this service be worth mentioning to others?
3. Was there a specific moment of exceptional care?
```

Essa seção pode gerar pontos bônus.

---

### 11.9 Menu / Product Feedback

Objetivo: avaliar um item específico de comida ou bebida.

Campos em inglês no app:

```txt
Product Name
Taste Score
Packaging & Presentation Score
Value Score
Product Comment
Product Photo
```

---

### 11.10 Information Only

Objetivo: registrar observações operacionais úteis que podem ou não pontuar.

Campos em inglês no app:

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

Alguns itens de informação podem não afetar o score final, mas devem aparecer no relatório porque são úteis para treinamento.

---

## 12. Regras de Pontuação

O app deve suportar perguntas com score.

Escala padrão:

```txt
0 / 5
1 / 5
2 / 5
3 / 5
4 / 5
5 / 5
N/A
```

**N/A** significa que a pergunta não conta no score final.

---

### 12.1 Cálculo do Score

```txt
Section Score = Sum of answered scored questions in that section
Section Max Score = Sum of max scores for applicable questions
Section Percentage = Section Score / Section Max Score × 100

Total Score = Sum of all section scores
Max Score = Sum of all applicable max scores
Final Percentage = Total Score / Max Score × 100
```

---

### 12.2 Faixas de Avaliação

```txt
95%–100% = Excellent / Bonus Standard
85%–94% = Good
70%–84% = Needs Focus
Below 70% = Critical Training Required
```

---

## 13. Status da Auditoria

As auditorias devem suportar estes status:

```txt
Draft
In Progress
Ready for Review
Completed
AI Report Generated
Action Plan Open
Action Plan Completed
```

Regras:

- Auditorias em Draft podem ser editadas
- Auditorias In Progress podem ser editadas
- Auditorias Completed devem ser bloqueadas
- Admin pode reabrir uma auditoria finalizada se necessário
- Relatório de IA pode ser regenerado pelo Admin
- Planos de ação podem ser acompanhados após a conclusão da auditoria

---

## 14. Regras de Evidência por Foto

As fotos devem ser vinculadas a:

- Audit
- Section
- Question
- User
- Store

Cada foto deve suportar:

```txt
Photo URL
Caption
Section Name
Question ID
Uploaded By
Created At
```

O relatório deve exibir fotos agrupadas por seção.

O upload deve usar a câmera do celular sempre que possível.

Formatos aceitos:

```txt
JPG
PNG
WEBP
HEIC if browser supports it
```

As imagens devem ser comprimidas antes do upload quando possível.

---

## 15. Integração com IA

A IA deve gerar o conteúdo final do relatório em inglês.

A IA não deve inventar fatos.

Ela deve usar apenas:

- Respostas da auditoria
- Scores
- Comentários
- Legendas das fotos
- Informações da loja
- Histórico de auditorias, se disponível

---

### 15.1 Saída da IA

A IA deve retornar:

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

---

### 15.2 Tom da IA

O tom deve ser:

```txt
Professional
Practical
Clear
Supportive
Training-focused
Operational
Not aggressive
Not vague
```

---

### 15.3 Formato do Plano de Ação da IA

Cada item do plano de ação deve incluir:

```txt
Action
Owner
Priority
Due Date
Success Measure
```

Exemplo:

```txt
Action: Coach all till team members on greeting, smile and eye contact before peak time.
Owner: MOD
Priority: High
Due Date: Within 7 days
Success Measure: MOD observes 5 customer interactions per shift and records feedback.
```

---

## 16. Prompt Base da IA

Usar este prompt base dentro da API route do backend:

```txt
You are an expert retail operations coach.

Generate a professional store audit report in English based only on the audit data provided.

Do not invent facts. Do not mention anything that is not present in the audit data.

The report must be clear, practical, supportive and focused on team training.

Return the response in this structure:

1. Executive Summary
2. What Went Well
3. What Needs Improvement
4. Priority Focus
5. Action Plan
6. Coaching Notes
7. Message to the Team
8. Follow-up Recommendations

For each action plan item, include:
- Action
- Owner
- Priority
- Due Date
- Success Measure

Audit Data:
{{AUDIT_DATA}}
```

---

## 17. Estrutura do Relatório Final

O relatório final deve ser gerado em inglês.

Seções do relatório:

```txt
Store Audit Report

1. Audit Summary
2. Score Overview
3. Category Breakdown
4. What Went Well
5. What Needs Improvement
6. AI Action Plan
7. Coaching Notes
8. Photo Evidence
9. Follow-up Actions
```

---

### 17.1 Audit Summary

Campos:

```txt
Store
Location
Date
Time
Auditor
MOD / Manager on Duty
Shift
Traffic Level
Visit Type
Final Score
Final Percentage
Final Rating
```

---

### 17.2 Category Breakdown

Mostrar:

```txt
Category
Score
Max Score
Percentage
Status
```

---

### 17.3 Photo Evidence

Agrupar por:

```txt
Store Standards
Availability / Selection
Speed
Service
Product Quality
Cleanliness
Menu / Product Feedback
Other
```

---

## 18. Exportação em PDF

A exportação em PDF é obrigatória.

O PDF deve ser:

- Profissional
- Legível no celular e desktop
- Fácil de compartilhar
- Em inglês
- Sem decoração exagerada
- Focado nos resultados da auditoria e no plano de ação

As seções do PDF devem corresponder à tela de relatório final.

---

## 19. Banco de Dados

Tabelas recomendadas no Supabase:

```txt
profiles
stores
audits
audit_sections
audit_questions
audit_answers
audit_photos
ai_reports
action_plans
action_plan_items
```

---

### 19.1 profiles

```txt
id
full_name
email
role
store_id
created_at
updated_at
```

Roles:

```txt
admin
auditor
manager
```

---

### 19.2 stores

```txt
id
name
location
area
active
created_at
updated_at
```

---

### 19.3 audits

```txt
id
store_id
auditor_id
manager_name
visit_date
visit_time
shift
traffic_level
visit_type
status
total_score
max_score
percentage
final_rating
initial_notes
created_at
updated_at
completed_at
```

---

### 19.4 audit_questions

```txt
id
section_name
question_text
question_description
max_score
is_required
is_critical
is_active
sort_order
created_at
updated_at
```

---

### 19.5 audit_answers

```txt
id
audit_id
question_id
section_name
question_text_snapshot
score
max_score
is_na
comment
is_critical_issue
created_at
updated_at
```

---

### 19.6 audit_photos

```txt
id
audit_id
answer_id
section_name
photo_url
caption
uploaded_by
created_at
```

---

### 19.7 ai_reports

```txt
id
audit_id
executive_summary
what_went_well
what_needs_improvement
priority_focus
coaching_notes
team_message
follow_up_recommendations
raw_ai_response
created_at
updated_at
```

---

### 19.8 action_plans

```txt
id
audit_id
focus_area
summary
generated_by_ai
status
created_at
updated_at
```

---

### 19.9 action_plan_items

```txt
id
action_plan_id
action
owner
priority
due_date
success_measure
status
created_at
updated_at
```

Statuses:

```txt
Open
In Progress
Completed
Cancelled
```

---

## 20. Direção de Design

O design deve ser:

```txt
Clean
Mobile-first
Fast
Professional
Operational
Simple
Training-focused
```

Evitar:

```txt
Complex dashboards in the first version
Heavy animations
Unnecessary decoration
Confusing navigation
Too many steps
Tiny buttons
Long forms on one screen
```

Estilo recomendado:

- Fundo claro ou branco
- Cards limpos
- Cabeçalhos de seção fortes
- Botões grandes para toque no celular
- Botões simples de score
- Indicador claro de progresso
- Botão fixo de **Next Section**
- Ação visível de **Save Draft**
- Layout mobile-first

---

## 21. Navegação

Rotas recomendadas:

```txt
/login
/dashboard
/admin
/admin/audits
/admin/stores
/admin/users
/audits/new
/audits/[id]/checklist
/audits/[id]/review
/audits/[id]/report
/audits/[id]/action-plan
/settings
```

---

## 22. Regras Não Negociáveis

Estas regras não podem ser quebradas:

```txt
1. The app must be in English.
2. Reports must be generated in English.
3. Users must log in.
4. Admin must see all audits.
5. Auditor must see only their own audits.
6. Completed audits must be locked by default.
7. Photos must be linked to specific audit questions.
8. AI must not invent facts.
9. AI API keys must never be exposed in frontend code.
10. The app must be mobile-first.
11. The app must remain simple and fast.
12. Scoring must be transparent and easy to understand.
13. Final reports must be professional and training-focused.
```

---

## 23. Escopo da Primeira Versão Final

A primeira versão completa deve incluir:

```txt
Login
Admin role
Auditor role
Dashboard
New audit
Checklist
Scoring
Comments
Photo upload
Audit review
Final report
AI action plan
Admin audit view
PDF export
PWA installation
```

Não obrigatório na primeira versão:

```txt
Offline sync
Advanced charts
AI image analysis
Push notifications
Manager role
Checklist editor
Multi-language support
```

Esses itens podem ser adicionados depois.

---

## 24. Nome do Produto

Nome recomendado:

```txt
Store Audit Trainer
```

Nomes alternativos:

```txt
Audit Coach
Store Coach
Retail Audit Trainer
```

Por enquanto, usar:

```txt
Store Audit Trainer
```

---

## 25. Definição Final do Produto

**Store Audit Trainer** é um PWA mobile-first para auditorias internas de loja e treinamento de equipe.

Ele permite que auditores façam avaliações estruturadas da loja, capturem evidências com fotos, calculem scores e gerem relatórios profissionais em inglês com planos de ação criados por IA.

O app deve ser simples o suficiente para ser usado durante uma caminhada real pela loja, mas estruturado o suficiente para que Admins acompanhem histórico, comparem performance e treinem equipes de forma eficiente.

---

## 26. Princípio de Implementação

O app deve ser construído em fases pequenas e controladas.

Não tentar criar tudo com um único prompt.

Ordem recomendada de implementação:

```txt
1. Project setup
2. Supabase setup
3. Authentication
4. User roles
5. Dashboards
6. Audit creation
7. Checklist
8. Scoring engine
9. Photo upload
10. Review screen
11. Final report
12. AI action plan
13. PDF export
14. PWA configuration
15. Testing and polishing
```

Cada fase deve ser concluída, testada e versionada antes de passar para a próxima.

---

## 27. Instrução para Agentes de IA

Qualquer agente de IA ou ferramenta de desenvolvimento deve tratar este documento como a fonte principal de verdade do projeto.

Antes de criar código, o agente deve:

```txt
1. Ler esta documentação completa.
2. Confirmar a stack do projeto.
3. Criar a estrutura inicial sem alterar o escopo.
4. Implementar uma fase por vez.
5. Não adicionar funcionalidades extras sem aprovação.
6. Manter o app em inglês.
7. Manter os relatórios em inglês.
8. Proteger as chaves de API.
9. Garantir permissões entre Admin e Auditor.
10. Testar cada fluxo antes de avançar.
```
