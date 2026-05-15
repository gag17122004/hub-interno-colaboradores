/**
 * m12-titulos.js — Gerador de Títulos
 * Parte 1: Otimizador com IA (Groq)
 * Parte 2: Multiplicador local sem API
 * Plataformas: Shopee, Shein, Mercado Livre, TikTok
 */
const M12 = (() => {
  const $ = id => document.getElementById(id);

  /* ─── Parte 1: IA ─── */
  async function optimizeTitle() {
    const title    = $('m12-title-input')?.value?.trim();
    const platform = $('m12-platform')?.value || 'Shopee';
    if (!title) { Toast.error('Informe o título atual.'); return; }

    const tips = {
      Shopee:         'SEO para buscas de produto; palavras-chave no início; evitar caracteres especiais; máximo 120 caracteres; incluir material, tamanho e quantidade quando relevante',
      Shein:          'Título descritivo e atrativo; focar em qualidade e praticidade; máximo 80 caracteres; linguagem simples',
      'Mercado Livre':'Palavras-chave relevantes no início; especificações técnicas (tamanho, material, quantidade); até 60 palavras; evitar caps excessivo',
      TikTok:         'Chamativo e emocional; linguagem jovem e atual; curto e impactante; máximo 100 caracteres; pode usar emojis com moderação'
    };

    const btn = $('m12-optimize-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'; }
    $('m12-ai-result')?.classList.add('hidden');

    try {
      const text = await GroqAI.call([{
        role: 'user',
        content: `Você é especialista em SEO de e-commerce para produtos de embalagens plásticas (sacos de lixo e envelopes). Gere 5 títulos otimizados para a plataforma ${platform}.\n\nTítulo atual: "${title}"\n\nDiretrizes para ${platform}: ${tips[platform] || 'SEO geral para e-commerce'}\n\nRetorne APENAS uma lista numerada (1. 2. 3. 4. 5.) com os 5 títulos, sem explicações ou cabeçalhos.`
      }], { max_tokens: 600 });
      renderTitleResults('m12-ai-output', text.split('\n').filter(l => l.trim()));
      $('m12-ai-result')?.classList.remove('hidden');
      Logger.log(`Gerou títulos IA para: ${title.substring(0, 40)}`);
    } catch (err) {
      Toast.error('Erro API: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Otimizar com IA'; }
    }
  }

  /* ─── Parte 2: Multiplicador ─── */
  const SYNONYMS = {
    'saco':          ['sacola', 'embalagem', 'bag'],
    'lixo':          ['resíduos', 'detritos', 'rejeitos'],
    'envelope':      ['malote', 'bolsa courier', 'embalagem'],
    'resistente':    ['reforçado', 'durável', 'robusto'],
    'preto':         ['escuro', 'black', 'escurecido'],
    'biodegradável': ['ecológico', 'sustentável', 'eco friendly'],
    'pacote':        ['kit', 'conjunto', 'caixa'],
    'rolo':          ['bobina', 'refil'],
    'plástico':      ['polietileno', 'PEBD', 'filme plástico'],
    'embalagem':     ['proteção', 'acondicionamento'],
    'doméstico':     ['para casa', 'residencial', 'caseiro'],
    'industrial':    ['profissional', 'comercial', 'empresarial'],
    'multiuso':      ['versátil', 'múltiplas funções', 'diversas finalidades'],
    'alto':          ['elevado', 'grande'],
    'baixo':         ['reduzido', 'compacto'],
  };

  const SUFFIX_POOL = [
    '', '', '',
    ' - Alta Qualidade', ' Original', ' Premium',
    ' Ideal para Casa', ' Uso Doméstico', ' Profissional',
    ' Melhor Preço', ' Kit Econômico', ' Oferta'
  ];
  const PREFIX_POOL = ['', '', '', 'Kit ', 'Pacote ', 'Lote '];

  function multiplyTitle() {
    const title = $('m12-mult-input')?.value?.trim();
    const count = Math.min(parseInt($('m12-mult-count')?.value) || 5, 30);
    if (!title) { Toast.error('Informe o título base.'); return; }

    const results = new Set();
    let attempts = 0;
    while (results.size < count && attempts < count * 6) {
      attempts++;
      let variant = title;
      Object.entries(SYNONYMS).forEach(([word, alts]) => {
        const re = new RegExp(`\\b${word}\\b`, 'gi');
        if (Math.random() > 0.45 && re.test(variant)) {
          const alt = alts[Math.floor(Math.random() * alts.length)];
          variant = variant.replace(re, alt);
        }
      });
      const pre = PREFIX_POOL[Math.floor(Math.random() * PREFIX_POOL.length)];
      const suf = SUFFIX_POOL[Math.floor(Math.random() * SUFFIX_POOL.length)];
      const candidate = (pre + variant + suf).trim();
      if (candidate !== title) results.add(candidate);
    }
    // Fallback: add numbered variants if not enough unique results
    while (results.size < count) results.add(`${title} — Variante ${results.size + 1}`);

    renderTitleResults('m12-mult-output', [...results]);
    $('m12-mult-result')?.classList.remove('hidden');
    Toast.success(`${results.size} variações geradas.`);
  }

  function renderTitleResults(containerId, lines) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = lines.map(l => {
      const clean = l.replace(/^\d+\.\s*/, '');
      return `
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:12px">
          <span style="flex:1">${Utils.esc(clean)}</span>
          <button class="btn btn-xs btn-secondary" title="Copiar"
            onclick="navigator.clipboard.writeText(${JSON.stringify(clean)}).then(()=>Toast.success('Copiado!'))">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>`;
    }).join('');
  }

  function setTab(tab) {
    ['ai', 'multiply'].forEach(t => {
      $(`m12-tab-${t}`)?.classList.toggle('active', t === tab);
      $(`m12-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
  }

  async function init() {
    $('m12-optimize-btn')?.addEventListener('click', optimizeTitle);
    $('m12-multiply-btn')?.addEventListener('click', multiplyTitle);
    $('m12-tab-ai')?.addEventListener('click',       () => setTab('ai'));
    $('m12-tab-multiply')?.addEventListener('click', () => setTab('multiply'));
  }

  return { init, setTab };
})();
