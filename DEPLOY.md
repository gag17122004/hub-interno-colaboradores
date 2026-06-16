# Deploy — Hub Interno Colaboradores

## Pré-requisitos

- **Node.js** 18 ou superior — necessário apenas para o Firebase CLI  
  Baixe em: https://nodejs.org
- **Conta Google** com acesso ao projeto Firebase `hub-interno-colaboradores`
- **Firebase CLI** instalado globalmente:
  ```bash
  npm install -g firebase-tools
  ```

---

## Configurar Firebase

1. Faça login com sua conta Google:
   ```bash
   firebase login
   ```

2. Verifique se o projeto está vinculado (já existe `.firebaserc` na raiz):
   ```bash
   firebase projects:list
   ```
   O projeto `hub-interno-colaboradores` deve aparecer na lista.

3. Copie o arquivo de variáveis de ambiente de exemplo e preencha com os valores reais:
   ```bash
   cp .env.example .env
   ```
   > **Nunca commite o arquivo `.env`** — ele está no `.gitignore`.

---

## Rodar localmente

O projeto não tem etapa de build. Para servir localmente com o Firebase:

```bash
firebase serve
```

Acesse em: **http://localhost:5000**

> Isso simula o Firebase Hosting localmente. O Firestore continuará apontando para o projeto real (nuvem). Para usar o emulador local do Firestore também, use `firebase emulators:start`.

---

## Deploy para produção

```bash
firebase deploy
```

Isso publica o conteúdo estático no Firebase Hosting.

Para fazer deploy apenas do Hosting (sem regras do Firestore):

```bash
firebase deploy --only hosting
```

Para fazer deploy apenas das regras do Firestore:

```bash
firebase deploy --only firestore:rules
```

---

## Verificar o deploy

Após o deploy, a URL do projeto aparece no terminal. Você também pode acessar:  
**Firebase Console → Hosting:** https://console.firebase.google.com/project/hub-interno-colaboradores/hosting
