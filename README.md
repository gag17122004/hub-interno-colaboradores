# Hub Interno — Gestão & Operações
### Pratik Distribuidora

Sistema web interno de gestão e operações. Desenvolvido em HTML/CSS/JavaScript puro, sem frameworks, instalável como PWA no celular e computador. Dados sincronizados em tempo real via Firebase Firestore.

---

## Módulos

| Rota | Módulo | Acesso |
|---|---|---|
| `me` | Meu Espaço | Colaborador |
| `colaboradores` | Banco de Colaboradores | Master |
| `m1` | Horas Extras + Ponto | Todos |
| `m2` | Custos & Produtos | Todos (preços só master) |
| `m3` | Precificação | Master |
| `m4` | Calculadora de Frete | Master |
| `m5` | Tarefas & Anotações | Todos (próprias p/ colab) |
| `m6` | Auditoria | Master |
| `m7` | Controle de Produção | Todos |
| `m8` | Orçamentos | Master |
| `m9` | Informe de Rendimento | Master |
| `m10` | Manutenção de Máquinas | Todos |
| `m11` | Disputas Shopee | Master |
| `m12` | Gerador de Títulos | Master |
| `m13` | Manuais de Plataformas | Master |
| `m14` | Manuais de Resolução | Todos (edita só master) |
| `m15` | To-do List Periódica | Todos |
| `m16` | Calendário | Todos |
| `m17` | Comunicados | Master cria, colab recebe |
| `m18` | Maquinário | Todos (edita só master) |
| `m19` | Checkup de Trocas | Todos |
| `m20` | Inventário | Master |
| `m21` | Contatos Rápidos | Todos |
| `ajuda` | Ajuda / Suporte | Todos |
| `settings` | Configurações | Master |

---

## Stack

- **Frontend:** HTML + CSS + JavaScript puro (ES Modules)
- **Banco de dados:** Firebase Firestore (sincronização em tempo real)
- **Auth:** Firebase Auth (anônima + Google Sign-In opcional)
- **IA:** Groq API — llama-3.3-70b-versatile
- **Deploy:** Firebase Hosting + GitHub Actions
- **App:** PWA instalável (celular e computador)

---

## Estrutura de arquivos

```
hub-interno/
├── index.html           ← App completo (CSS embutido + templates HTML)
├── core.js              ← Storage/Firestore, Auth, Utils, Toast, Modal, Router
├── shared.js            ← Funções compartilhadas entre módulos
├── colaboradores.js     ← Gestão do banco de colaboradores
├── meu-espaco.js        ← Módulo "Meu Espaço" do colaborador
├── groq.js              ← Cliente centralizado da API Groq
├── firebase-config.js   ← Credenciais e inicialização Firebase
├── m1-horas.js          ← M1: Horas Extras + Ponto
├── m2-custos.js         ← M2: Custos, Matéria-Prima e Produtos
├── m3-precificacao.js   ← M3: Precificação e Lucro Líquido
├── m4-m5.js             ← M4: Frete + M5: Tarefas
├── m6-auditoria.js      ← M6: Auditoria
├── m7-producao.js       ← M7: Controle de Produção
├── m8-orcamentos.js     ← M8: Orçamentos
├── m9-rendimento.js     ← M9: Informe de Rendimento (IA)
├── m10-manutencao.js    ← M10: Manutenção de Máquinas
├── m11-disputas.js      ← M11: Disputas Shopee
├── m12-titulos.js       ← M12: Gerador de Títulos
├── m13-m20.js           ← M13 a M20: Manuais, To-do, Calendário, etc.
├── manifest.json        ← Configuração PWA
├── sw.js                ← Service Worker (cache offline)
├── icon.svg             ← Ícone do app (logo Pratik)
├── firebase.json        ← Configuração Firebase Hosting
├── firestore.rules      ← Regras de segurança do Firestore
├── FIREBASE_SETUP.md    ← Guia de configuração do Firebase
└── .github/workflows/
    └── deploy.yml       ← CI/CD: push → deploy automático Firebase
```

---

## Como usar

1. Acesse a URL do deploy
2. Selecione seu nome e digite sua senha
3. Navegue pelos módulos pela sidebar

## Como instalar como app

**Celular:** Chrome → menu → "Adicionar à tela inicial"

**Computador:** Chrome/Edge → ícone de instalação na barra de endereço

---

## Deploy

GitHub Actions faz deploy automático no Firebase Hosting a cada push na branch `main`.

---

## ⚠️ Segurança

Nunca commite a chave do Groq no `groq.js`. Use variável de ambiente ou configure a chave pelo painel de configurações do master dentro do app.

---

## Pendências técnicas

- [ ] Mover chave Groq para configurações do master (não hardcoded no código)
- [ ] Migração API IA → conta OpenAI da empresa (avaliação futura)
- [ ] Refatoração DRY ao final do desenvolvimento completo
