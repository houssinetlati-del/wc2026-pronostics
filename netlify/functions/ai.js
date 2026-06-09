exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'}, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { messages, system } = JSON.parse(event.body);
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://pronostics-wc2026-pf.netlify.app',
        'X-Title': 'WC2026 Pronostics'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: system || 'Tu es un expert football.' },
          ...messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content.filter(c=>c.type==='text').map(c=>c.text).join('') }))
        ],
        max_tokens: 500
      })
    });
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || data.error?.message || 'Pas de réponse.';
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text }] })
    };
  } catch(e) {
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}, body: JSON.stringify({ content: [{ type: 'text', text: 'Erreur: ' + e.message }] }) };
  }
};
