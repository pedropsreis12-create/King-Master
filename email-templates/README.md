# E-mail de recuperação do King Master

Arquivos oficiais do modelo:

- `password-reset.html`: versão visual completa para envio em HTML.
- `password-reset.txt`: alternativa de texto para clientes de e-mail e para o editor simples do Firebase.

Campos do Firebase:

- Nome do remetente: `King Master`
- Assunto: `Redefina sua senha | King Master`
- Idioma: português do Brasil (`pt-BR`)
- Página de ação personalizada: `https://pedropsreis12-create.github.io/King-Master/recuperar.html`

Os marcadores `%LINK%` e `%EMAIL%` devem ser substituídos pelo serviço de autenticação no momento do envio. Nunca publicar no navegador uma credencial administrativa, senha SMTP ou chave secreta de um provedor de e-mail.

O HTML foi construído com tabelas de apresentação, estilos em linha, botão compatível com Outlook e regras para telas pequenas. O arquivo pode ser usado diretamente apenas por um serviço de envio que aceite HTML. O editor padrão do Firebase pode oferecer somente a versão de texto; nesse caso, usar `password-reset.txt` e manter a página de ação personalizada.
