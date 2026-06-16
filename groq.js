const GROQ_API_KEY = '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';

const GroqAI = {
  async call(messages, { model = 'llama-3.3-70b-versatile', max_tokens = 2048 } = {}) {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
      throw new Error('Chave da API do Groq não configurada em groq.js.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    let resp;
    try {
      resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({ model, max_completion_tokens: max_tokens, messages }),
        signal: controller.signal
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Timeout: a IA demorou demais. Tente novamente.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
    const json = await resp.json();
    if (json.error) throw new Error(json.error.message);
    return json.choices?.[0]?.message?.content || '';
  }
};

window.GroqAI = GroqAI;
