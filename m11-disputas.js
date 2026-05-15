/**
 * m11-disputas.js — Gerador de Scripts de Disputa Shopee (Master Only)
 * Dois dropdowns: motivo do cliente + justificativa interna
 * Variante aleatória por combinação para evitar detecção algorítmica
 * Scripts editáveis pelo master sem mexer no código
 */
const M11 = (() => {
  const KEY = 'hub_dispute_scripts';
  const $ = id => document.getElementById(id);

  const SEED = {
    reasons: [
      { id: 'r1', label: 'Produto diferente do anúncio' },
      { id: 'r2', label: 'Produto com defeito / danificado' },
      { id: 'r3', label: 'Não recebi o pedido' },
      { id: 'r4', label: 'Produto de baixa qualidade' },
      { id: 'r5', label: 'Arrependimento de compra' },
      { id: 'r6', label: 'Produto errado enviado' },
      { id: 'r7', label: 'Embalagem danificada na entrega' },
    ],
    justifications: [
      { id: 'j1', label: 'Produto conforme descrição e fotos do anúncio' },
      { id: 'j2', label: 'Rastreamento confirma entrega no endereço' },
      { id: 'j3', label: 'Produto passou por controle de qualidade antes do envio' },
      { id: 'j4', label: 'Fotos da embalagem na expedição arquivadas' },
      { id: 'j5', label: 'Prazo e condições dentro do acordado na compra' },
    ],
    scripts: [
      { id: 's1', reasonId: 'r1', justId: 'j1', variants: [
        'Olá, equipe de mediação. Analisamos a solicitação, porém o item entregue corresponde exatamente às características técnicas, fotos e descrição presentes no anúncio. Solicitamos a recusa da devolução por este motivo, pois cumprimos rigorosamente com o ofertado.',
        'Saudações. Gostaríamos de contestar a alegação do comprador. O produto recebido possui as exatas especificações informadas na página da compra. Pedimos a análise criteriosa do anúncio para constatar que não houve divergência no envio.',
        'Prezados, o item enviado é idêntico ao nosso catálogo. Não há erro logístico ou de cadastro de nossa parte. Solicitamos o encerramento da disputa em favor do vendedor, visto que o produto está em total conformidade com a compra.'
      ]},
      { id: 's2', reasonId: 'r2', justId: 'j3', variants: [
        'Olá. Todos os nossos produtos passam por um rigoroso controle de qualidade, sendo conferidos antes do empacotamento. O item saiu de nosso centro de distribuição em perfeitas condições de uso. Pedimos análise para descartar mau uso ou danos no transporte.',
        'Saudações, equipe. Contestamos o defeito de fábrica relatado, pois realizamos inspeção prévia de funcionamento e integridade na nossa linha de expedição. Anexamos as evidências do estado original do produto no momento do envio.',
        'Prezada mediação, informamos que o produto foi testado pelo nosso setor de qualidade e não apresentava avarias. Solicitamos a verificação detalhada do caso, pois o item foi despachado intacto e devidamente protegido.'
      ]},
      { id: 's3', reasonId: 'r3', justId: 'j2', variants: [
        'Olá. Conforme o código de rastreamento oficial da transportadora parceira, o pedido consta como entregue no endereço cadastrado no sistema. Solicitamos que o comprador verifique com vizinhos, familiares ou na portaria do condomínio.',
        'Saudações. A alegação de não recebimento é improcedente, visto que a atualização logística confirma a entrega no local exato informado no ato da compra. Pedimos a validação do comprovante de entrega (POD) junto à transportadora.',
        "Prezada equipe, o status logístico do pedido já se encontra finalizado como 'Entregue'. Orientamos o encerramento da solicitação de reembolso ou a exigência de acareação por parte da transportadora responsável pela plataforma."
      ]},
      { id: 's4', reasonId: 'r4', justId: 'j3', variants: [
        'Olá, equipe. O produto enviado atende aos padrões de qualidade descritos no anúncio e foi inspecionado em nossa expedição. A percepção pessoal de qualidade não configura defeito de fabricação. O item cumpre com sua função e categoria de preço.',
        'Saudações. Reforçamos que o produto corresponde exatamente à descrição técnica ofertada. A nossa equipe de qualidade valida os lotes recebidos e despachados. Trata-se de um produto com excelente custo-benefício, exatamente como anunciado.',
        'Prezados, nosso controle garante que todos os itens estejam de acordo com as especificações da fábrica. A alegação de "baixa qualidade" não se justifica como erro do vendedor, pois entregamos exatamente o material detalhado na página de vendas.'
      ]},
      { id: 's5', reasonId: 'r5', justId: 'j1', variants: [
        'Olá. Estamos cientes do direito de arrependimento do consumidor e o aceitamos. Ressaltamos apenas que o envio ocorreu de forma impecável e conforme o anúncio. Aguardamos o retorno do produto em sua embalagem original, sem sinais de uso, para liberação do reembolso.',
        'Saudações. O produto foi enviado corretamente e de acordo com o pedido. Em caso de devolução por arrependimento, solicitamos o apoio da plataforma para garantir que o item seja devolvido nas mesmas condições de venda e com todos os acessórios, protegendo nosso estoque.',
        'Prezada mediação, concordamos com a devolução por arrependimento, desde que as políticas da plataforma sejam cumpridas pelo comprador. O item foi enviado perfeitamente conforme as fotos, e seu retorno deve preservar o estado de novo para revenda.'
      ]},
      { id: 's6', reasonId: 'r6', justId: 'j4', variants: [
        'Olá. Contestamos o envio incorreto. Nosso sistema conta com bipagem de segurança e arquivamento de imagens da expedição, comprovando que o SKU correto (conforme o pedido) foi inserido na embalagem. Anexamos as provas para a mediação.',
        'Saudações. A alegação não procede. Possuímos registros visuais do nosso controle logístico no momento exato em que este pedido foi preparado. O item embalado e etiquetado corresponde 100% ao que foi comprado.',
        'Prezados, solicitamos a recusa desta solicitação. As imagens de nossa expedição atestam o envio do produto exato. Não houve falha na separação, garantindo a lisura do nosso processo de fulfillment.'
      ]},
      { id: 's7', reasonId: 'r7', justId: 'j4', variants: [
        'Olá. O produto foi embalado com proteção adequada e saiu de nossa expedição intacto, conforme provam nossos registros fotográficos anexos. A avaria na embalagem ocorreu por manuseio logístico, sendo de responsabilidade da transportadora parceira.',
        'Saudações, equipe. Contestamos qualquer responsabilidade pelo dano. Nossas imagens de postagem mostram a caixa perfeitamente lacrada e segura. Pedimos que o ônus seja repassado à transportadora e o saldo do vendedor seja resguardado.',
        'Prezada mediação, o dano relatado não ocorreu em nossas dependências. Temos provas do padrão de embalagem seguro utilizado neste envio. Trata-se de uma falha exclusiva de transporte e logística da plataforma.'
      ]}
    ]
  };

  function loadData() {
    let data = Storage.getSync(KEY, null);
    if (!data) {
      data = SEED;
      Storage.setSync(KEY, data);
    }
    return data;
  }

  function populateDropdowns() {
    const data = loadData();
    const reasonSel = $('m11-reason');
    const justSel   = $('m11-just');
    if (reasonSel) {
      reasonSel.innerHTML = `<option value="">Selecione o motivo do cliente...</option>` +
        data.reasons.map(r => `<option value="${Utils.esc(r.id)}">${Utils.esc(r.label)}</option>`).join('');
    }
    if (justSel) {
      justSel.innerHTML = `<option value="">Selecione a justificativa interna...</option>` +
        data.justifications.map(j => `<option value="${Utils.esc(j.id)}">${Utils.esc(j.label)}</option>`).join('');
    }
  }

  function generateScript() {
    const data     = loadData();
    const reasonId = $('m11-reason')?.value;
    const justId   = $('m11-just')?.value;
    if (!reasonId || !justId) { Toast.error('Selecione o motivo e a justificativa.'); return; }

    const match = data.scripts.find(s => s.reasonId === reasonId && s.justId === justId);
    const output = $('m11-output');
    $('m11-result-area')?.classList.remove('hidden');
    if (!match || !match.variants?.length) {
      if (output) output.value = 'Nenhum script cadastrado para esta combinação. Acesse a aba "Gerenciar Scripts" para adicionar.';
      Toast.info('Combinação sem script cadastrado.');
      return;
    }
    const idx = Math.floor(Math.random() * match.variants.length);
    if (output) output.value = match.variants[idx];
    const reason = data.reasons.find(r => r.id === reasonId)?.label || reasonId;
    Toast.success(`Variante ${idx + 1} de ${match.variants.length} — ${reason}`);
  }

  function copyScript() {
    const output = $('m11-output');
    if (!output?.value?.trim()) { Toast.error('Nenhum script gerado.'); return; }
    navigator.clipboard.writeText(output.value)
      .then(() => Toast.success('Script copiado!'))
      .catch(() => Toast.error('Não foi possível copiar automaticamente.'));
  }

  async function generateScriptAI() {
    const data     = loadData();
    const reasonId = $('m11-reason')?.value;
    const justId   = $('m11-just')?.value;
    if (!reasonId || !justId) { Toast.error('Selecione o motivo e a justificativa.'); return; }

    const reason = data.reasons.find(r => r.id === reasonId)?.label || reasonId;
    const just   = data.justifications.find(j => j.id === justId)?.label  || justId;

    const btn = $('m11-ai-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'; }
    $('m11-result-area')?.classList.remove('hidden');
    const output = $('m11-output');
    if (output) output.value = '';

    try {
      const text = await GroqAI.call([{
        role: 'system',
        content: 'Você é um especialista em atendimento e mediação de disputas para vendedores em marketplaces brasileiros (Shopee, Mercado Livre). Redija scripts profissionais, formais e convincentes para defesa do vendedor.'
      }, {
        role: 'user',
        content: `Gere um script de defesa para disputa no marketplace.\n\nMotivo alegado pelo cliente: "${reason}"\nJustificativa interna do vendedor: "${just}"\n\nO script deve ser:\n- Formal e profissional\n- Direcionado à equipe de mediação da plataforma\n- Objetivo, com no máximo 3 parágrafos\n- Sem marcadores markdown\n\nRetorne apenas o texto do script, pronto para uso.`
      }], { model: 'llama-3.1-8b-instant', max_tokens: 400 });
      if (output) output.value = text.trim();
      Logger.log(`Gerou script IA: ${reason}`);
    } catch (err) {
      Toast.error('Erro ao chamar IA: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-robot"></i> Gerar com IA'; }
    }
  }

  /* ── Gerenciamento de scripts (master) ── */
  function renderScriptsManagement() {
    const container = $('m11-scripts-manage');
    if (!container) return;
    const data = loadData();

    container.innerHTML = data.scripts.map((s, si) => {
      const reason = data.reasons.find(r => r.id === s.reasonId)?.label || s.reasonId;
      const just   = data.justifications.find(j => j.id === s.justId)?.label  || s.justId;
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-header" style="margin-bottom:12px">
            <div>
              <div class="text-xs text-muted">Motivo: <strong class="text-accent">${Utils.esc(reason)}</strong></div>
              <div class="text-xs text-muted mt-1">Justificativa: <strong>${Utils.esc(just)}</strong></div>
            </div>
            <span class="badge badge-muted">${s.variants.length} variante(s)</span>
          </div>
          ${s.variants.map((v, vi) => `
            <div style="margin-bottom:10px">
              <div class="text-xs text-muted mb-1" style="display:flex;justify-content:space-between">
                <span>Variante ${vi + 1}</span>
                <button class="btn btn-xs btn-danger" onclick="M11.removeVariant(${si},${vi})">
                  <i class="fa-solid fa-times"></i>
                </button>
              </div>
              <textarea class="m11-script-ta" data-si="${si}" data-vi="${vi}"
                rows="3" style="font-size:12px;line-height:1.6">${Utils.esc(v)}</textarea>
            </div>`).join('')}
          <button class="btn btn-secondary btn-sm" onclick="M11.addVariant(${si})">
            <i class="fa-solid fa-plus"></i> Adicionar Variante
          </button>
        </div>`;
    }).join('');

    container.querySelectorAll('.m11-script-ta').forEach(ta => {
      ta.addEventListener('input', () => {
        const d  = loadData();
        const si = parseInt(ta.dataset.si);
        const vi = parseInt(ta.dataset.vi);
        // decode HTML entities back to plain text for storage
        const tmp = document.createElement('div');
        tmp.innerHTML = ta.value;
        d.scripts[si].variants[vi] = ta.value;
        Storage.setSync(KEY, d);
      });
    });
  }

  function addVariant(si) {
    const data = loadData();
    data.scripts[si].variants.push('Novo script — edite aqui.');
    Storage.setSync(KEY, data);
    renderScriptsManagement();
    Toast.success('Variante adicionada.');
  }

  function removeVariant(si, vi) {
    const data = loadData();
    if (data.scripts[si].variants.length <= 1) {
      Toast.error('Mantenha ao menos uma variante.'); return;
    }
    data.scripts[si].variants.splice(vi, 1);
    Storage.setSync(KEY, data);
    renderScriptsManagement();
  }

  function setTab(tab) {
    ['generator', 'manage'].forEach(t => {
      $(`m11-tab-${t}`)?.classList.toggle('active', t === tab);
      $(`m11-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'manage') renderScriptsManagement();
  }

  function init() {
    populateDropdowns();
    $('m11-generate-btn')?.addEventListener('click', generateScript);
    $('m11-ai-btn')?.addEventListener('click', generateScriptAI);
    $('m11-copy-btn')?.addEventListener('click', copyScript);
    $('m11-tab-generator')?.addEventListener('click', () => setTab('generator'));
    $('m11-tab-manage')?.addEventListener('click',    () => setTab('manage'));

    document.addEventListener('route:change', (e) => {
      if (e.detail.route !== 'm11') return;
      populateDropdowns();
    });
  }

  return { init, setTab, addVariant, removeVariant, generateScriptAI };
})();
window.M11 = M11;
