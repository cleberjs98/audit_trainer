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
Audit Trainer com identidade propria, nao Pret-specific
Estilo visual
Operations command center moderno com superficies branco/cinza
Cores principais
Graphite, Signal Crimson, branco e cinza operacional
Cor primária
Signal Crimson
Ícone
AT dentro de um quadrado arredondado Signal Crimson
Fluxo do checklist
Wizard guiado com uma pergunta por vez, stepper circular e review final
Score
Core + bonus, exemplo: 88/95 + 5/5 bonus
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
- O checklist deve mostrar uma pergunta por vez no fluxo guiado para manter foco e contexto.
- O stepper circular deve permitir voltar, avançar e saltar para perguntas respondidas ou pendentes.
- Score e status devem aparecer em pontos claros; Pret CE V1 deve preferir core + bonus, por exemplo `88/95 + 5/5 bonus`.
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
Background
#F4F6F8
Fundo geral do app.
Surface
#FFFFFF
Cards, inputs e superficies principais.
Surface Soft
#F8FAFC
Filtros, areas secundarias, campos leves e painels discretos.
Signal Crimson / Primary
#D11F3A
Botoes principais, links importantes, progresso ativo e marca.
Primary Dark
#A9152D
Estados de hover/press para acoes principais.
Primary Soft
#FDE8EC
Badges, fundos leves e estados sutis da marca.
Graphite / Foreground
#171A1F
Títulos e texto primário.
Muted Text
#667085
Subtítulos, placeholders e textos secundários.
Muted Strong
#475467
Texto secundario com mais enfase.
Border
#D9DEE7
Bordas suaves de cards e inputs.
Accent
#FFB020
Destaques especiais e Outstanding Card bonus.
Success
#12B76A
Status Excellent, melhoria positiva e indicadores aprovados.
Warning
#F79009
Status Good/Needs Focus leve, alertas médios.
Danger
#F04438
Critical, erros e problemas graves.
Info
#344054
Areas informativas, paineis escuros e sidebar.
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
Regra importante: Signal Crimson é a cor da marca e das ações principais. Os status devem seguir verde/âmbar/vermelho para evitar confusão visual. Bonus 0/5 ou bonus não respondido deve ser neutro, nunca vermelho, porque não penaliza o core score.
# 6. Tipografia e Estilo Visual
- Usar uma fonte sans-serif limpa, como Inter, Geist, Arial ou equivalente.
- Títulos grandes, pretos, com peso forte.
- Texto secundário em cinza operacional.
- Botões com bordas arredondadas, altura confortável para toque e cor Signal Crimson.
- Botões primary/crimson sempre usam texto branco.
- Cards com fundo branco, borda cinza suave e sombra discreta.
- Evitar excesso de animações, gradientes fortes ou elementos decorativos pesados.
- O fundo deve ser cinza claro/branco, não creme/bege como identidade principal.
# 7. Componentes Base
Componente
Definição
App Icon
AT dentro de quadrado arredondado Signal Crimson.
Primary Button
Fundo Signal Crimson, texto branco, alto contraste, usado para ações principais.
Secondary Button
Fundo branco ou surface-soft, borda cinza, texto graphite ou crimson no hover.
Card
Superficie branca, borda cinza suave, raio grande e sombra premium discreta.
Input / Select
Borda cinza, placeholder cinza, foco com ring Signal Crimson.
Score Selector
Botoes segmentados 0,1,2,3,4,5 para Pret CE core. Selecionado em Signal Crimson com texto branco. Legacy pode manter N/A quando aplicavel.
Status Chip
Pílula colorida: verde, âmbar ou vermelho conforme status.
Checklist Stepper
Marcadores circulares conectados por linha horizontal. Core 5/5 verde, 4/5 âmbar, 0-3/5 vermelho, não respondido neutro. Current step respondido preserva a cor do score e adiciona ring crimson. Bonus usa marcador de estrela: 5/5 dourado, 0/5 ou não respondido neutro.
Photo Uploader
Botão com ícone de foto, texto Add Photo e preview quando houver imagem.
Progress Bar
Track cinza claro com preenchimento Signal Crimson.
Bottom Navigation
Apenas quando necessario em dashboards e areas principais. Item ativo em Signal Crimson.
Desktop Sidebar
Dashboard desktop usa sidebar escura graphite com links claros, item ativo em Signal Crimson e Sign out integrado ao footer junto do bloco da conta.
# 8. Navegação Principal
- Login direciona o usuário para o dashboard correto conforme role.
- Area Manager vê uma visão por área.
- Store Manager e Leader veem a visão da própria loja.
- Leader pode visualizar auditorias da própria loja para aprender e comparar.
- A navegação inferior pode aparecer nos dashboards: Dashboard, Stores, Action Plans, Alerts, More.
- Durante uma auditoria, usar navegação focada: Back, Save & Continue, Save & Review e Review & Complete. A navegação global deve aparecer como ações secundárias compactas para Dashboard e Audit History.
# 9. Especificação das Telas
## Login Screen
- Objetivo: entrada segura no app.
- Elementos: logo checklist, título Audit Trainer, subtítulo, email, password, Sign In, Forgot Password, Internal access only.
- Ação principal: Sign In.
- Visual: split layout em desktop, card de login forte, fundo cinza claro/branco e CTA Signal Crimson.
- Password show/hide é um botão local seguro que não altera o submit.
- Forgot password é placeholder seguro enquanto recuperação não estiver implementada.
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
- Ação principal: Start Audit.
- Validação: campos obrigatórios com mensagens em inglês.
## Checklist / Audit Execution
- Objetivo: executar auditoria por seção de forma rápida.
- Formato: wizard mobile-first, uma pergunta por vez.
- Elementos por pergunta: section label, pergunta, max score, score selector segmentado, optional notes.
- Ações do card: Back e Save & Continue; no fim, Save & Review.
- Stepper circular mostra progresso e score por pergunta.
## Review Audit Screen
- Objetivo: revisar antes de finalizar.
- Elementos: audit summary, score core + bonus como `88/95 + 5/5 bonus`, status, section breakdown, missing required questions, critical issues, photos attached.
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
- Usar fundo cinza claro/branco e cards com bordas cinza suaves.
- Usar Signal Crimson apenas como cor principal de marca e CTA.
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
Audit Trainer deve ser um PWA interno, mobile-first, com identidade propria Graphite + Signal Crimson, visual de operations command center, superficies branco/cinza, cards premium, acoes primarias crimson com texto branco e relatórios em inglês focados em plano de ação. O objetivo do UI/UX é permitir que líderes e managers usem o app com rapidez dentro da loja, enquanto Admins e Area Managers conseguem enxergar performance, comparar lojas e acompanhar planos de melhoria.

