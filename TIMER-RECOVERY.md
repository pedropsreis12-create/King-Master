# Recuperação do cronômetro

O relógio mantém um checkpoint local pequeno a cada segundo contabilizado. Ele contém a sessão, a matéria, a configuração de alarme e os totais correspondentes, para restaurá-los juntos sem somar XP novamente. Pausar, encerrar e fechar a página também salvam o estado. A gravação completa usa o salvamento automático já conectado ao Firebase a cada 15 segundos durante a contagem; o envio depende de conexão e autenticação.

Ao reabrir, a sessão é recuperada **pausada**, sem acrescentar o período em que o site esteve fechado. Abas mantidas em segundo plano continuam usando tempo real. Estudo e descanso são tratados separadamente. Encerrar a sessão limpa o rascunho na mesma gravação do histórico. Uma importação da nuvem invalida o checkpoint anterior e desativa a gravação no fechamento dessa página, evitando sobrescrever o conteúdo importado.

O checkpoint é do mesmo navegador e endereço. Limpar os dados do navegador remove essa cópia. Uma falha de armazenamento exibe aviso junto ao relógio. A recuperação protege os segundos já registrados; uma interrupção abrupta pode perder a fração do segundo ainda não contabilizada.

## Verificação em 7 de setembro de 2026

- 44 testes automatizados aprovados, incluindo 12 de relógio/XP: fechamento, pausa, retomada, dados inválidos, importação, descanso, encerramento, reset, falha de armazenamento, mudança de dia e de semana.
- No navegador, o relógio chegou a 19 segundos; após recarregar, continuou com 19 segundos e pausado. Uma segunda recarga preservou o mesmo valor.
- Menu desktop recolhido, perfil legível e navegação móvel sem transbordamento em 390 px.
- Cenários das cinco molduras iniciais verificados por troca no laboratório; apenas uma camada de cenário permanece após cada troca. XP real restaurado após o teste.
