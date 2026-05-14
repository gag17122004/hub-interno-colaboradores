/**
 * groq.js — Cliente centralizado para a API do Groq
 * Coloque sua chave abaixo antes de usar.
 */

const GROQ_API_KEY = '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'; // gsk_...

const GroqAI = {
  /**
   * Chama a API do Groq (compatível com OpenAI).
   * @param {Array<{role:string,content:string}>} messages
   * @param {{ model?: string, max_tokens?: number }} options
   * @returns {Promise<string>} texto da resposta
   */
  async call(messages, { model = 'llama-3.3-70b-versatile', max_tokens = 2048 } = {}) {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
      throw new Error('Chave da API do Groq não configurada em groq.js.');
    }
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({ model, max_completion_tokens: max_tokens, messages })
    });
    const json = await resp.json();
    if (json.error) throw new Error(json.error.message);
    return json.choices?.[0]?.message?.content || '';
  }
};
