/**
 * groq.js — Cliente centralizado para a API do Groq
 * Coloque sua chave abaixo antes de usar.
 */

const GROQ_API_KEY = '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';

const GroqAI = {
  async call(messages, { model = 'llama-3.3-70b-versatile', max_tokens = 2048 } = {}) {
    const GROQ_API_KEY = await getGroqKey();
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada no Firebase Remote Config.');
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
