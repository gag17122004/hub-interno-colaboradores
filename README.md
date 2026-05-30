# Hub Interno — Gestão & Operações
### Pratik Distribuidora

Sistema web interno de gestão e operações. Desenvolvido em HTML/CSS/JavaScript puro, sem frameworks, instalável como PWA no celular e computador.

---

## Módulos

| # | Módulo | Descrição |
|---|---|---|
| M1 | Horas Extras + Ponto | Controle de jornada com regras CLT |
| M2 | Custos & Produtos | Catálogo, matéria-prima e cálculo de custos |
| M3 | Precificação | Simulação de lucro por marketplace |
| M4 | Calculadora de Frete | Peso real vs. cúbico com visualização 3D |
| M5 | Tarefas | CRUD de anotações internas |
| M6 | Auditoria | Log de ações dos colaboradores |
| M7 | Controle de Produção | Registro diário por máquina |
| M8 | Orçamentos | Geração de orçamentos para clientes físicos |
| M9 | Rendimento | Relatórios de desempenho via IA |
| M10 | Manutenção | Ocorrências e chamados técnicos (HECE) |
| M11 | Disputas Shopee | Gerador de scripts de defesa |
| M12 | Gerador de Títulos | Otimização SEO por marketplace via IA |
| M13 | Manuais Plataformas | Como anunciar em cada marketplace |
| M14 | Manuais Técnicos | Resolução de problemas internos |
| M15 | To-do List | Tarefas periódicas |
| M16 | Calendário | Eventos e agenda da empresa |
| M17 | Comunicados | Alertas e emergências para colaboradores |
| M18 | Maquinário | Manuais e contatos técnicos |
| M19 | Checkup de Trocas | Registro de trocas de tamanho nas máquinas |
| M20 | Inventário | Catalogação de inventário |

---

## Stack

- **Frontend:** HTML + CSS + JavaScript puro
- **Dados:** LocalStorage do navegador
- **IA:** Groq API (llama-3.3-70b-versatile)
- **Deploy:** Vercel
- **App:** PWA (instalável offline)

---

## Como usar

1. Acesse a URL do deploy ou abra o `index.html` localmente
2. Faça login com suas credenciais
3. Navegue pelos módulos pela sidebar

## Como instalar como app

**Celular:** Chrome → menu → "Adicionar à tela inicial"

**Computador:** Chrome/Edge → ícone de instalação na barra de endereço

---

## Deploy

Conectado ao Vercel via GitHub. Qualquer push na branch `main` gera deploy automático.

---

## Pendências técnicas

- [ ] Migração LocalStorage → Supabase (sincronização entre dispositivos)
- [ ] Migração API IA → conta OpenAI da empresa
- [ ] Refatoração DRY ao final do desenvolvimento
