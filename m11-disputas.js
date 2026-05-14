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
        'Prezado(a) comprador(a), analisamos sua reclamação com atenção. Nosso produto foi fabricado e comercializado exatamente conforme as especificações do anúncio — dimensões, material e quantidade conferem. As fotos do anúncio representam fielmente o item enviado. Solicitamos que reavalie o produto com base nas medidas descritas.',
        'Agradecemos o contato. O produto enviado corresponde integralmente ao anúncio publicado. Dimensões, material e quantidade estão dentro do especificado. Se houver dúvida sobre as medidas, nossa equipe está disponível para esclarecimentos.',
        'Prezado(a) cliente, o produto comercializado segue rigorosamente as especificações do anúncio, com tolerâncias de fabricação padrão do setor de embalagens plásticas. Podemos enviar fotos adicionais que comprovem a conformidade do item caso necessário.'
      ]},
      { id: 's2', reasonId: 'r2', justId: 'j3', variants: [
        'Lamentamos o ocorrido. Todos os nossos produtos passam por controle de qualidade antes do despacho. Pedimos que nos envie fotos do defeito para que possamos analisar e oferecer a melhor solução. Nossa prioridade é sua satisfação.',
        'Olá! Nossos produtos são verificados individualmente antes do envio. Pode ter ocorrido algum dano durante o transporte. Solicite fotos do produto e da embalagem para que possamos acionar o seguro de transporte e resolver rapidamente.',
        'Agradecemos o feedback. Nossa linha conta com verificação de qualidade em cada lote. Para prosseguir com sua solicitação, precisamos de fotos evidenciando o defeito relatado. Assim que recebermos, daremos retorno ágil.'
      ]},
      { id: 's3', reasonId: 'r3', justId: 'j2', variants: [
        'Prezado(a) cliente, de acordo com o rastreamento, seu pedido foi entregue na data e endereço confirmados no sistema. Sugerimos verificar se algum familiar, porteiro ou vizinho recebeu o pacote. Em caso de persistência, entre em contato com a transportadora informando o código de rastreio.',
        'Verificamos que o rastreamento confirma a entrega do seu pedido. Em muitos casos a encomenda é entregue a um vizinho ou deixada na portaria. Solicitamos que verifique esses locais antes de prosseguirmos com a investigação formal.',
        'Os registros logísticos indicam que o pedido foi entregue corretamente. Pedimos que confirme o endereço de entrega registrado e verifique com demais moradores. Se o problema persistir, podemos abrir contestação junto à transportadora.'
      ]},
      { id: 's4', reasonId: 'r4', justId: 'j3', variants: [
        'Prezado(a) comprador(a), nossos produtos são fabricados com matéria-prima de qualidade e seguem normas técnicas do setor de embalagens plásticas. Espessura e resistência estão dentro dos parâmetros descritos no anúncio. Estamos à disposição para detalhar as especificações técnicas do produto.',
        'Agradecemos o retorno. Nossa fabricação utiliza resina com controle rigoroso de micragem. O produto atende ao padrão de desempenho informado no anúncio. Se desejar, podemos enviar nossa ficha técnica com os laudos de qualidade.',
        'Entendemos que a qualidade percebida pode variar. Garantimos que nosso produto foi fabricado conforme especificações, com testes de resistência e vedação realizados em cada lote. Teremos prazer em detalhar as características técnicas para melhor avaliação.'
      ]},
      { id: 's5', reasonId: 'r5', justId: 'j1', variants: [
        'Prezado(a) cliente, lamentamos que o produto não tenha atendido às expectativas. O item foi entregue conforme anunciado, dentro das especificações divulgadas. Por tratar-se de produto fabricado sob especificação, não realizamos devoluções por arrependimento após entrega. Agradecemos a compreensão.',
        'Entendemos sua situação. Nosso produto foi enviado exatamente como descrito no anúncio, e a compra foi realizada de forma consciente. Conforme política da plataforma para produtos desta categoria, não somos obrigados a aceitar devolução por arrependimento após o recebimento.',
        'O produto entregue está em conformidade total com o anúncio. Para casos de arrependimento após recebimento de produto em perfeito estado e conforme descrito, a política vigente não prevê obrigatoriedade de devolução por parte do vendedor.'
      ]},
      { id: 's6', reasonId: 'r6', justId: 'j4', variants: [
        'Prezado(a) cliente, verificamos nossas fotos de expedição e o produto enviado está correto conforme o pedido. Pode ter ocorrido um equívoco na identificação do item. Solicito que confirme a SKU/código impresso na embalagem com o que consta no seu pedido na plataforma.',
        'Temos registro fotográfico do produto separado para o seu pedido e os dados conferem com o solicitado. Pedimos que verifique a etiqueta da embalagem e compare com o descritivo do pedido antes de prosseguirmos.',
        'Nossas operações contam com checagem dupla na expedição. As fotos da embalagem do seu pedido estão arquivadas e confirmam o envio do produto correto. Por favor, verifique o código do produto na embalagem recebida e nos informe se houver divergência.'
      ]},
      { id: 's7', reasonId: 'r7', justId: 'j4', variants: [
        'Lamentamos pelo dano ocorrido durante o transporte. O produto foi embalado corretamente, conforme atestam nossas fotos de expedição. Recomendamos registrar uma reclamação junto à transportadora com fotos da embalagem danificada. Estamos acompanhando o caso para garantir a melhor solução.',
        'Agradecemos o contato. Nossos produtos são embalados com proteção adequada para transporte. Danos ocorridos no trajeto são de responsabilidade da transportadora. Por favor, nos envie fotos da embalagem e do produto para que possamos acionar o seguro de frete.',
        'Nosso procedimento de embalagem garante proteção adequada ao produto. Eventuais danos causados pelo manuseio incorreto durante o transporte devem ser reportados à transportadora com evidências fotográficas. Estamos à disposição para auxiliar nesse processo.'
      ]}
    ]
  };

  function loadData() {
    let data = Storage.get(KEY, null);
    if (!data) {
      data = SEED;
      Storage.set(KEY, data);
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
        Storage.set(KEY, d);
      });
    });
  }

  function addVariant(si) {
    const data = loadData();
    data.scripts[si].variants.push('Novo script — edite aqui.');
    Storage.set(KEY, data);
    renderScriptsManagement();
    Toast.success('Variante adicionada.');
  }

  function removeVariant(si, vi) {
    const data = loadData();
    if (data.scripts[si].variants.length <= 1) {
      Toast.error('Mantenha ao menos uma variante.'); return;
    }
    data.scripts[si].variants.splice(vi, 1);
    Storage.set(KEY, data);
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
    $('m11-copy-btn')?.addEventListener('click', copyScript);
    $('m11-tab-generator')?.addEventListener('click', () => setTab('generator'));
    $('m11-tab-manage')?.addEventListener('click',    () => setTab('manage'));

    document.addEventListener('route:change', e => {
      if (e.detail.route !== 'm11') return;
      populateDropdowns();
    });
  }

  return { init, setTab, addVariant, removeVariant };
})();
