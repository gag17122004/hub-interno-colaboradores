# Configuração do Firebase Firestore — Hub Interno de Colaboradores

## 📋 Resumo das Mudanças

Este documento descreve todas as alterações realizadas para migrar o "Hub Interno de Colaboradores" do **localStorage** para o **Firebase Firestore**, mantendo a compatibilidade com o código existente.

### Arquivos Criados

1. **`firebase-config.js`** — Inicialização do Firebase e exportação da instância do Firestore
2. **`firestore.rules`** — Regras de segurança do Firestore (pronto para deploy)
3. **`FIREBASE_SETUP.md`** — Este guia

### Arquivos Modificados

1. **`index.html`** — Adicionado import do `firebase-config.js` via módulo ES6
2. **`core.js`** — Reescrita completa da camada `Storage` com suporte assíncrono e feature flag
3. **`m1-horas.js` até `m12-titulos.js`** — Atualizado para usar `await` nas chamadas do Storage
4. **`meu-espaco.js`** — Atualizado para usar `await` nas chamadas do Storage

---

## 🚀 Passo 1: Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Criar um projeto"**
3. Preencha o nome do projeto (ex: `hub-interno-colaboradores`)
4. Aceite os termos e clique em **"Criar projeto"**
5. Aguarde a criação (leva alguns segundos)

---

## 🔑 Passo 2: Obter Credenciais

1. No Firebase Console, clique no ícone de engrenagem (⚙️) → **"Configurações do projeto"**
2. Vá para a aba **"Geral"**
3. Role para baixo até encontrar a seção **"Seus apps"**
4. Clique em **"</>"** (Web) para registrar um app web
5. Preencha o nome da app (ex: `Hub Interno`)
6. Clique em **"Registrar app"**
7. Na próxima tela, você verá um objeto JavaScript com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789...",
  appId: "1:123456789:web:abc123..."
};
```

---

## 📝 Passo 3: Adicionar Credenciais ao Projeto

1. Abra o arquivo **`firebase-config.js`** na raiz do seu projeto
2. Localize o objeto `firebaseConfig` com os placeholders:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJECT_ID.firebaseapp.com",
     projectId: "SEU_PROJECT_ID",
     storageBucket: "SEU_PROJECT_ID.appspot.com",
     messagingSenderId: "SEU_MESSAGING_SENDER_ID",
     appId: "SEU_APP_ID"
   };
   ```
3. **Cole as credenciais** que você copiou do Firebase Console
4. Salve o arquivo

---

## 🗄️ Passo 4: Criar Firestore Database

1. No Firebase Console, vá para **"Firestore Database"** (menu esquerdo)
2. Clique em **"Criar banco de dados"**
3. Escolha a localização (ex: `us-central1`)
4. Selecione **"Iniciar no modo de teste"** (você configurará as regras depois)
5. Clique em **"Criar"**

---

## 🔐 Passo 5: Configurar Regras de Segurança

1. No Firestore, vá para a aba **"Regras"**
2. **Copie todo o conteúdo** do arquivo **`firestore.rules`** que está no seu projeto
3. **Cole no editor de regras** do Firebase Console
4. Clique em **"Publicar"**

**Nota:** As regras atuais permitem leitura e escrita aberta. Para um ambiente de produção, considere migrar para **Firebase Authentication** e usar regras baseadas em `request.auth.uid`.

---

## 🔄 Passo 6: Feature Flag (Opcional)

No arquivo **`core.js`**, no topo, há uma constante:

```javascript
const USAR_FIREBASE = true;
```

- **`true`** → Usa Firebase Firestore (com fallback para localStorage)
- **`false`** → Usa apenas localStorage (comportamento original)

Se algo der errado, você pode rapidamente voltar para o localStorage alterando para `false`.

---

## 📊 Estrutura de Dados no Firestore

### Coleção `compartilhado/`

Armazena dados que **todos os colaboradores veem**:

| Documento | Tipo | Descrição |
|-----------|------|-----------|
| `hub_employees` | Array | Lista de colaboradores |
| `hub_hours` | Object | Horas extras por funcionário |
| `hub_products` | Array | Produtos cadastrados |
| `hub_clients` | Array | Clientes |
| `hub_quotes` | Array | Orçamentos |
| `hub_maintenance` | Array | Manutenções |
| `hub_production` | Array | Registros de produção |
| `hub_pricing` | Object | Preços dos produtos |
| `hub_raw_prices` | Object | Preços de matéria-prima |
| `hub_mkt_fees` | Object | Taxas de marketplace |
| `hub_debts` | Object | Débitos |
| `hub_audit` | Array | Logs de auditoria |
| `hub_dispute_scripts` | Object | Scripts de disputa |
| `hub_prod_goal` | Number | Meta de produção |
| `hub_products_seeded_v1` | Array | Produtos seed |

### Coleção `usuarios/{userName}/`

Armazena dados **individuais por colaborador**:

| Documento | Tipo | Descrição |
|-----------|------|-----------|
| `hub_theme` | String | Tema (dark/light) |
| `hub_absences` | Array | Ausências do colaborador |
| `hub_time_records` | Array | Registros de ponto |
| `hub_tasks` | Array | Tarefas do colaborador |
| `hub_prod_goals` | Object | Metas de produção individuais |

**Nota:** `hub_session` é sempre lido/escrito no localStorage para manter o login funcional durante a inicialização.

---

## 🔄 Migração de Dados

O Storage foi configurado para **migrar automaticamente** dados do localStorage para o Firestore na primeira leitura:

1. Se uma chave não existe no Firestore, o Storage verifica o localStorage
2. Se encontrar no localStorage, salva no Firestore e retorna o valor
3. Nas próximas leituras, vem direto do Firestore

**Resultado:** Nenhuma perda de dados, migração transparente.

---

## ⚡ Mudanças no Código

### Storage agora é assíncrono

**Antes:**
```javascript
const data = Storage.get('hub_employees', []);
```

**Depois:**
```javascript
const data = await Storage.get('hub_employees', []);
```

### Funções que usam Storage precisam ser `async`

**Antes:**
```javascript
function load() {
  employees = Storage.get(Storage.KEYS.EMPLOYEES, []);
}
```

**Depois:**
```javascript
async function load() {
  employees = await Storage.get(Storage.KEYS.EMPLOYEES, []);
}
```

### Chamadas de funções assíncronas precisam de `await`

**Antes:**
```javascript
load();
```

**Depois:**
```javascript
await load();
```

---

## 🎯 Loading State

Um spinner de carregamento é exibido automaticamente enquanto os dados são buscados do Firestore. Ele desaparece quando a operação termina.

Para desabilitar, você pode comentar as linhas `_showLoading()` e `_hideLoading()` em `core.js`.

---

## 🐛 Troubleshooting

### Erro: "Firebase is not defined"
- Verifique se `firebase-config.js` está sendo carregado no `index.html`
- Confirme que o `<script type="module" src="firebase-config.js"></script>` está presente

### Erro: "db is not defined"
- Verifique se o `firebase-config.js` está exportando `db`
- Confirme que `core.js` está importando `db` corretamente

### Dados não aparecem no Firestore
- Verifique se as credenciais do Firebase estão corretas em `firebase-config.js`
- Confirme que o Firestore Database foi criado
- Verifique as regras de segurança (devem permitir read/write)

### Voltar para localStorage
- Altere `const USAR_FIREBASE = true;` para `const USAR_FIREBASE = false;` em `core.js`
- Recarregue a página

---

## 📱 Dados em Tempo Real

Todos os colaboradores veem os dados compartilhados **em tempo real**. Se um colaborador atualizar um valor em `compartilhado/`, todos os outros verão a mudança automaticamente na próxima leitura do Storage.

Para implementar sincronização em tempo real com listeners, você pode usar `onSnapshot()` do Firestore (consulte a documentação do Firebase).

---

## 🔒 Segurança em Produção

As regras atuais em `firestore.rules` permitem acesso aberto. Para um ambiente de produção:

1. **Migre para Firebase Authentication** (Google, Email/Senha, etc.)
2. **Atualize as regras** para usar `request.auth.uid`
3. **Implemente controle de acesso** baseado em perfil (master/colab)

Exemplo de regra mais segura:
```firestore
match /compartilhado/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.token.profile == 'master';
}
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique o console do navegador (F12 → Console) para mensagens de erro
2. Consulte a [documentação oficial do Firebase](https://firebase.google.com/docs)
3. Verifique se todas as credenciais estão corretas em `firebase-config.js`

---

## ✅ Checklist de Implementação

- [ ] Projeto Firebase criado
- [ ] Firestore Database criado
- [ ] Credenciais adicionadas ao `firebase-config.js`
- [ ] Regras de segurança publicadas
- [ ] App testada e funcionando
- [ ] Dados aparecendo no Firestore Console
- [ ] Colaboradores vendo dados em tempo real

---

**Última atualização:** Maio 2026  
**Versão:** 1.0
