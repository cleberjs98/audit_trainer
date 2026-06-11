Audit Trainer
Documento UI/UX e Design System
Documentação em português | Aplicativo e relatórios em inglês
PWA interno para auditoria de loja, treinamento operacional, evidências com fotos, score e plano de ação com IA.


# 1. Resumo das Decisões Fechadas
Decisão
Definição
Nome exibido
Audit Trainer
Nome técnico/projeto
Store Audit Trainer
Tipo
PWA mobile-first
Identidade inicial
App interno, simples e operacional
Estilo visual
SaaS moderno com fundo creme claro e cards
Cores principais
Bordô, creme e preto
Cor primária
Bordô elegante
Ícone
Checklist dentro de um quadrado arredondado
Fluxo do checklist
Uma seção por vez, com todas as perguntas da seção abertas em cards
Score
Pontos + percentual, exemplo: 76/95 · 80% — Needs Focus
Tom do relatório
Profissional e diplomático
Relatório
Focado em plano de ação
Validação visual
Apenas quando necessário, principalmente em telas importantes
# 2. Princípios de UX
- O app deve ser rápido para usar andando pela loja.
- A interface deve ser clara mesmo em ambiente com movimento, pressa e iluminação forte.
- O usuário não deve precisar pensar muito para avançar: cada tela deve ter uma ação principal evidente.
- O dashboard deve priorizar performance e action plans, não apenas criação de auditorias.
- O checklist deve mostrar uma seção por vez para manter foco e contexto.
- Todas as perguntas da seção ficam abertas para acelerar a auditoria.
- Score e status devem aparecer sempre em pontos e percentual.
- A IA deve produzir relatório em inglês, com tom profissional, diplomático e focado em treinamento.
- O app é interno por enquanto, então deve ser funcional, limpo e confiável, sem parecer marketing demais.
# 3. Papéis e Hierarquia de Acesso
Papel
Permissão UX
Admin
Acesso total ao sistema: todas as lojas, áreas, usuários, auditorias, relatórios e planos de ação.
Area Manager
Acessa lojas da própria área. Pode comparar performance entre lojas e ver action plans da área.
Store Manager / Gerente
Acessa relatórios da própria loja. Pode acompanhar score, histórico e plano de ação da loja.
Leader
Acessa todas as auditorias da própria loja para aprender, comparar e treinar. Pode criar auditorias, preencher checklist e consultar relatórios da loja.
# 4. Paleta de Cores
Token
Hex
Uso
Primary Burgundy
#7A1E2C
Botões principais, ícones ativos, barra de progresso, links importantes.
Dark Burgundy
#4A0F1A
Estados de hover/press, cabeçalhos fortes e detalhes premium.
Accent Red
#B3263A
Alertas de marca com baixa frequência.
Cream Background
#F7F1E8
Fundo geral do app.
Light Surface
#FFFCF7
Cards, inputs e superfícies principais.
Text Black
#171717
Títulos e texto primário.
Muted Text
#6B625C
Subtítulos, placeholders e textos secundários.
Border Beige
#E5D8CC
Bordas suaves de cards e inputs.
Success
#15803D
Status Excellent, melhoria positiva e indicadores aprovados.
Warning
#B7791F
Status Good/Needs Focus leve, alertas médios.
Danger
#B91C1C
Critical, erros e problemas graves.
# 5. Status e Score
Faixa
Status
Cor
Significado
95%–100%
Excellent
Verde
Performance excelente / padrão de bônus.
85%–94%
Good
Verde ou neutro positivo
Boa performance com oportunidades menores.
70%–84%
Needs Focus
Âmbar
Precisa de foco e plano de ação.
Abaixo de 70%
Critical
Vermelho
Precisa de atenção imediata.
Regra importante: o bordô é a cor da marca e das ações principais. Os status devem seguir verde/amarelo/vermelho para evitar confusão visual.
# 6. Tipografia e Estilo Visual
- Usar uma fonte sans-serif limpa, como Inter, Geist, Arial ou equivalente.
- Títulos grandes, pretos, com peso forte.
- Texto secundário em cinza quente.
- Botões com bordas arredondadas, altura confortável para toque e cor bordô.
- Cards com fundo Light Surface, borda bege suave e sombra discreta.
- Evitar excesso de animações, gradientes fortes ou elementos decorativos pesados.
- O fundo deve ser creme claro, não branco puro, para dar uma sensação mais quente e premium.
# 7. Componentes Base
Componente
Definição
App Icon
Checklist dentro de quadrado arredondado bordô.
Primary Button
Fundo bordô, texto branco, alto contraste, usado para ações principais.
Secondary Button
Fundo claro, borda bege, texto bordô.
Card
Superfície creme/branca, borda bege, raio grande e sombra suave.
Input / Select
Borda bege, ícone à esquerda, placeholder cinza, chevron bordô quando dropdown.
Score Selector
Botões 0,1,2,3,4,5,N/A. Selecionado em bordô.
Status Chip
Pílula colorida: verde, âmbar ou vermelho conforme status.
Photo Uploader
Botão com ícone de foto, texto Add Photo e preview quando houver imagem.
Progress Bar
Track bege claro com preenchimento bordô.
Bottom Navigation
Apenas em dashboards e áreas principais. Item ativo em bordô.
# 8. Navegação Principal
- Login direciona o usuário para o dashboard correto conforme role.
- Area Manager vê uma visão por área.
- Store Manager e Leader veem a visão da própria loja.
- Leader pode visualizar auditorias da própria loja para aprender e comparar.
- A navegação inferior pode aparecer nos dashboards: Dashboard, Stores, Action Plans, Alerts, More.
- Durante uma auditoria, usar navegação focada: Previous Section, Save Draft, Next Section.
# 9. Especificação das Telas
## Login Screen
- Objetivo: entrada segura no app.
- Elementos: logo checklist, título Audit Trainer, subtítulo, email, password, Sign In, Forgot Password, Internal access only.
- Ação principal: Sign In.
- Visual: centralizado, limpo, com card de login grande e fundo creme.
## Area Manager Dashboard
- Objetivo: ver performance da área, action plans e lojas com maior necessidade de foco.
- Elementos: selector de área, Average Score, Stores, Open Action Plans, Critical Alerts, Store Performance, Priority Focus.
- Ação principal: abrir relatórios/lojas/action plans que precisam de atenção.
- Foco: B e C — performance e planos de ação.
## Leader / Store Dashboard
- Objetivo: mostrar performance da loja e facilitar criação/consulta de auditorias.
- Elementos: store selector, Average Score, Open Action Plans, Needs Focus, Start New Audit, Recent Audits.
- Ação principal: consultar performance e iniciar auditoria quando necessário.
- Leader pode ver auditorias da própria loja para aprender e comparar.
## New Audit Screen
- Objetivo: iniciar auditoria com dados corretos.
- Campos: Store, Visit Date, Visit Time, MOD / Manager on Duty, Shift, Traffic Level, Visit Type, Initial Notes.
- Ações: Start Audit e Save Draft.
- Validação: campos obrigatórios com mensagens em inglês.
## Checklist / Audit Execution
- Objetivo: executar auditoria por seção de forma rápida.
- Formato: uma seção por vez, todas as perguntas da seção abertas em cards.
- Elementos por pergunta: score selector, comment, Add Photo, Critical Issue toggle.
- Ações fixas: Previous Section, Save Draft, Next Section.
## Review Audit Screen
- Objetivo: revisar antes de finalizar.
- Elementos: audit summary, score 76/95 · 80%, status, section breakdown, missing required questions, critical issues, photos attached.
- Ações: Complete Audit e Back to Checklist.
- Regra: bloquear conclusão se houver perguntas obrigatórias pendentes.
## Final Report + AI Action Plan
- Objetivo: entregar relatório final com foco em plano de ação.
- Elementos: score hero, What Went Well, What Needs Improvement, Priority Focus, AI Action Plan, Photo Evidence, Export PDF.
- Tom: profissional e diplomático.
- Relatório e plano de ação sempre em inglês.
# 10. Referências Visuais Geradas
As imagens abaixo são referências visuais para orientar o desenvolvimento da interface. Elas não precisam ser copiadas pixel-perfect, mas devem definir a direção visual, estrutura, cores, espaçamento e hierarquia das telas.
## 10.1 Login Screen

Figura 1: Login Screen

## 10.2 Area Manager Dashboard

Figura 2: Area Manager Dashboard

## 10.3 Leader / Store Dashboard

Figura 3: Leader / Store Dashboard

## 10.4 New Audit Screen

Figura 4: New Audit Screen

## 10.5 Checklist / Audit Execution

Figura 5: Checklist / Audit Execution

## 10.6 Review Audit Screen

Figura 6: Review Audit Screen

## 10.7 Final Report + AI Action Plan

Figura 7: Final Report + AI Action Plan
# 11. Regras para o Copilot / Agente de IA
- Usar este documento como referência de UI/UX.
- Não alterar nome, cores principais ou estilo visual sem aprovação.
- Manter todo o app em inglês.
- Manter relatórios em inglês.
- Usar fundo creme claro e cards com bordas suaves.
- Usar bordô apenas como cor principal de marca e CTA.
- Usar verde/amarelo/vermelho para status funcionais.
- Criar componentes reutilizáveis antes de construir telas grandes.
- Construir mobile-first e depois adaptar para desktop.
- Fazer validação visual apenas nas telas principais ou quando houver mudança visual relevante.
# 12. Critério de Aprovação Visual
- A interface parece um app real e confiável.
- O usuário consegue entender a ação principal em cada tela em menos de 3 segundos.
- Botões são grandes o suficiente para uso no celular.
- Não há excesso de informação em uma única área.
- O dashboard prioriza performance e action plans.
- O checklist é rápido para preencher andando pela loja.
- O relatório final parece profissional e útil para treinamento.
- A identidade visual permanece consistente em todas as telas.
# 13. Resumo Final
Audit Trainer deve ser um PWA interno, mobile-first, com visual SaaS moderno, fundo creme claro, cards limpos, bordô elegante como cor primária e relatórios em inglês focados em plano de ação. O objetivo do UI/UX é permitir que líderes e managers usem o app com rapidez dentro da loja, enquanto Admins e Area Managers conseguem enxergar performance, comparar lojas e acompanhar planos de melhoria.

