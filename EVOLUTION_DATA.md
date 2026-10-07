# Evolução de dados — 2026-10-02

## Biblioteca de cadernos — 2026-10-07

- A nova área Cadernos é uma visão das páginas já existentes em `cycleItems[].topicos[].caderno.paginas[]`. Não duplica textos nem cria coleção separada. A anotação legada `topicos[].notas`, quando ainda não migrada, vira uma página uma única vez usando a marca `cadernoMigrado` já adotada pelo caderno do assunto.
- Cada página pode ter `status`, `continuation`, `source`, `edition`, `sourcePage`, `checkedAt` e `linkedPageIds`. Campos ausentes em páginas antigas recebem padrões apenas na interface. Os vínculos usam IDs das páginas e continuam opcionais.
- `versoes[]` guarda no máximo oito estados anteriores por página; uma versão é criada apenas ao salvar uma alteração pelo novo editor. A restauração preserva o estado substituído no mesmo histórico. O limite evita crescimento indefinido do documento principal.
- Rascunhos de edição ainda não salvos ficam apenas no `localStorage` deste dispositivo, na chave `kingMasterLibraryDraft:<pageId>`. Eles não são enviados à nuvem até o usuário salvar. A exportação Word gera um `.doc` compatível com HTML, não um `.docx` nativo.

## Cadernos, trilhas e planejamento — 2026-10-06

- `cycleItems[].topicos[].id` é um ID estável com prefixo `assunto-`. A migração aditiva vincula pelo nome os registros antigos de `historyItems`, `revisoesItems`, `cadernoErrosItems`, `practiceSessions` e `flashcards.decks` com `topicId`; registros sem correspondência continuam legíveis pelo nome. Renomear o assunto atualiza também os nomes desses registros.
- `cycleItems[].temas[]` contém `{id, nome, ordem}`. Cada assunto pode ter `temaId`; ausência significa o tema virtual “Conteúdo geral”. Excluir um tema mantém os assuntos e move-os para esse grupo geral.
- `studyLogging.reviewTrail` contém de 2 a 6 intervalos em dias (padrão `[1,7,15,30]`). `topicos[].trilha` mantém uma cópia dos intervalos, a data de início e etapas `{numero,dataPrevista,status,concluidaEm,resultado,notas,tentativasFracas}`. Somente a etapa ativa gera um espelho em `revisoesItems` com `origem:'trilha'`, `topicId` e `trilhaEtapa`. Concluir, adiar e reagendar atualizam o mesmo assunto por ID. `topicos[].desempenhoRecentes` guarda até 20 resultados de questões para avaliar domínio recente sem confundir com o acumulado. Revisões manuais antigas permanecem independentes.
- `topicos[].caderno.paginas[].destaques[]` guarda posições, trecho, cor, comentário e data de criação. O Caderno central agrega páginas, destaques, regras anti-erro, cartões e notas diretamente das fontes; não copia os textos. Apenas `cadernoCentral.revisados` persiste um mapa de IDs compostos para a data da última revisão visual; `cadernoCentral.legendaCores` guarda os rótulos personalizáveis das quatro cores. Flashcards originados de um destaque usam `sourceNoteId` para ligar a página.
- `studentPlan` guarda objetivo, curso, nota-alvo, nome e datas informadas para a prova, pesos, ritmo e minutos de cada dia da semana. Sem perfil configurado, o plano diário continua usando `dailyGoalMinutes`. Uma folga com meta zero não é tratada como falha.
- `planosSemanais[YYYY-Www]` guarda até 12 propostas ou planos aceitos, metas por matéria, tarefas e ajustes. Não altera blocos existentes sem o estudante abrir e confirmar o organizador do Cronograma.
- `prazos[]` guarda título, tipo, data opcional, prova relacionada e conclusão. Modelos do ENEM ficam sem datas até conferência no edital oficial. O link do Google Agenda cria somente uma proposta de evento após a ação do estudante.

Todos esses campos permanecem no documento privado de progresso e no backup existente. Nenhuma migração destrutiva ou coleção nova foi introduzida. Atenção ao limite de tamanho do documento principal quando houver muitos registros e páginas longas.

## Plano diário automático — 2026-10-05

- O diagnóstico de erro pode sugerir um flashcard conceitual. Ao salvar um erro com a opção marcada, `flashcards.cards[].sourceErrorId` guarda o ID do erro; o cartão e seu deck entram no mesmo salvamento do registro. Dados antigos não precisam desse campo. Perguntas iguais no mesmo deck não são duplicadas.
- `autopilot.autoErrorFlashcards` é opcional, padrão ligado. Controla apenas o estado inicial da opção no formulário; o aluno ainda confirma o registro e pode desmarcar o cartão individualmente.
- O painel mostra o ritmo médio por área a partir de `practiceSessions` dos últimos sete dias, sem novo campo persistido; questões puladas e durações inválidas não entram na média. O treino avisa discretamente após quatro minutos numa questão.
- O laboratório experimental de XP só fica visível em `localhost`/`127.0.0.1`. Nenhum dado de XP ou patente foi apagado.

- `autopilot` é opcional e preserva todos os campos antigos. A ausência usa `{ enabled: true, dailyMinutes: 240, subjectWeights: {}, todayBudget: null }`.
- `autopilot.todayBudget` guarda `{ date: YYYY-MM-DD, minutes }` somente para o dia escolhido; no dia seguinte volta à meta normal. Nenhuma sessão ou bloco existente é modificado ao mudar esse orçamento.
- O plano diário é calculado a partir de matérias, assuntos, histórico, revisões e blocos existentes. Não é salvo como histórico de estudo e não cria conclusão fictícia.
- `practiceSessions[]`: até 30 treinos gerados de questões. Cada registro guarda matéria, assunto, respostas e tempo por questão; a sessão resumida entra em `historyItems` e os erros individuais em `cadernoErrosItems` no mesmo salvamento. Dados antigos sem esse campo usam lista vazia.
- A leitura de foto/texto no Caderno de Erros usa o Gemini existente, mas produz somente uma prévia para aprovação. Não cria novo campo persistido, não escolhe a causa do erro pelo estudante e não salva nada sem o formulário.

O King Master continua usando `appData` no armazenamento local e o documento privado `users/{uid}` no Firestore. Nenhuma coleção nova foi criada nesta etapa.

## Campos aditivos

- `flashcards.decks[].subjectIds`: IDs das matérias existentes. `subjectId` permanece como o primeiro ID para compatibilidade com leitores antigos. A abertura de dados antigos cria `subjectIds` sem excluir `subjectId` nem cartões.
- `flashcards.trash[]`: `{ deck, deletedAt }`. Cartões, estados de repetição e histórico permanecem armazenados enquanto o deck estiver na lixeira; a restauração reativa o mesmo ID.
- `revisoesItems[].materiaIds`: matérias relacionadas por ID; `materia` continua representando a primeira matéria para manter os fluxos antigos. Revisões antigas são associadas pelo nome, quando possível.
- `generatedExams[]`: até seis provas geradas com questões, alternativas, gabarito, respostas, marcações, tempo ativo e status (`ready`, `running`, `done`). O resumo de uma prova finalizada também entra em `simuladosItems` com `generatedExamId`, para usar os gráficos existentes sem duplicar o resultado.
- `quickNotes[].type`: um dos estilos de anotação. A ausência significa `normal`.
- `quickNotes[].subjectIds`: relações com matérias existentes. Notas antigas com `subject` são associadas pelo nome quando há correspondência; o campo `subject` continua sendo salvo para compatibilidade.
- `quickNotes[].color`, `pinned`, `checkedLines`: metadados opcionais de post-it, fixação e checklist. Texto e IDs antigos são preservados.
- `quickNotes[].image`: metadados de uma imagem privada. Os bytes otimizados usam a infraestrutura autenticada `reviewImages` já existente, sem entrar no documento principal. Cópias de um caderno compartilham a mesma imagem; ela só é excluída da nuvem quando nenhuma anotação a referencia.
- `personalDevelopment.spaces[].items[]` para hábitos: `frequency` contém `mode` (`daily`, `weekdays`, `weekly`), `weekdays` e `timesPerWeek`. Ausência equivale a hábito diário.
- `habit.checkins[YYYY-MM-DD]`: entradas antigas `true` continuam válidas. Entradas novas usam `{ status: 'done'|'missed'|'skip', reason?, updatedAt }`.

## Limites e pendências

O documento principal do Firestore tem limite de tamanho. A lixeira conserva os cartões, portanto muitos decks excluídos ainda ocupam espaço. Ainda falta migração para documentos independentes e exclusão definitiva controlada.

O seletor múltiplo foi integrado a decks, notas, revisões, simulados manuais novos e configuração dos simulados gerados. Registros antigos mantêm seus formatos de matéria e não foram convertidos automaticamente para evitar quebrar históricos.

O assistente continua usando Gemini via Firebase AI Logic. O novo contexto acadêmico só inclui detalhes de notas, erros e hábitos quando o pedido os menciona. Nenhuma ferramenta recebe permissão nova para alterar dados sem confirmação.

O perfil atual é privado por conta; moderação confiável de conteúdo público e análise de imagens no servidor dependem de um backend apropriado. Validação visual no navegador, sozinha, não é moderação segura.

Os simulados gerados usam o mesmo Gemini do site, sem ativar faturamento, com até 30 questões, três gerações bem-sucedidas por dia neste navegador e no máximo seis provas armazenadas. A prévia das questões fica apenas na memória até o usuário escolher guardar ou começar. O freio diário é de experiência, não um limite de segurança no servidor. A geração depende da disponibilidade da cota gratuita; se acabar, o registro manual continua disponível.
