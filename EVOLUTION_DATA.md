# Evolução de dados — 2026-10-02

## Plano diário automático — 2026-10-05

- O diagnóstico de erro pode sugerir um flashcard conceitual. Ao salvar um erro com a opção marcada, `flashcards.cards[].sourceErrorId` guarda o ID do erro; o cartão e seu deck entram no mesmo salvamento do registro. Dados antigos não precisam desse campo. Perguntas iguais no mesmo deck não são duplicadas.
- `autopilot.autoErrorFlashcards` é opcional, padrão ligado. Controla apenas o estado inicial da opção no formulário; o aluno ainda confirma o registro e pode desmarcar o cartão individualmente.
- O painel mostra o ritmo médio por área a partir de `practiceSessions` dos últimos sete dias, sem novo campo persistido; questões puladas e durações inválidas não entram na média. O treino avisa discretamente após quatro minutos numa questão.

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
