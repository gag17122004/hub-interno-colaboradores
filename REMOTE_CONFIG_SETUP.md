# Firebase Remote Config — Setup da GROQ_API_KEY

**Sem este passo o app não consegue chamar a IA (retorna chave vazia).**

## Passo a passo

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e abra o projeto **hub-interno-colaboradores**.

2. No menu lateral, vá em **Remote Config** (seção "Engage").

3. Clique em **Adicionar parâmetro** (ou "Add parameter").

4. Preencha:
   - **Nome do parâmetro:** `GROQ_API_KEY`
   - **Tipo de dado:** String
   - **Valor padrão:** cole a chave real da Groq (começa com `gsk_...`)

5. Clique em **Salvar** e depois em **Publicar alterações**.

## Comportamento após publicação

- O SDK busca o valor no Remote Config a cada **1 hora** (TTL configurado).
- Na primeira chamada da sessão, `fetchAndActivate` faz a requisição HTTP para o Remote Config e retorna a chave atualizada.
- A chave nunca aparece nos arquivos-fonte do projeto.

## Segurança

O Remote Config **não é** um secrets manager — o valor pode ser lido por qualquer usuário autenticado que inspecione as chamadas à API do Remote Config. Para uso interno (colaboradores autenticados via Firebase Auth) esse nível de proteção é suficiente: a chave sai do código-fonte versionado e deixa de aparecer em repositórios/histórico git.

Se for necessário nível maior de segurança, o passo seguinte é mover a chamada à Groq para uma Cloud Function autenticada.
