exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { messages, system } = JSON.parse(event.body);

    const contents = [];
    messages.forEach(m => {
      let text = typeof m.content === 'string' ? m.content
        : Array.isArray(m.content) ? m.content.filter(c=>c.type==='text').map(c=>c.text).join('\n')
        : '';
      if (text) contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text }] });
    });

    if (contents.length === 0) {
      return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},
        body: JSON.stringify({ content: [{ type:'text', text:'Bonjour !' }] }) };
    }

    const geminiBody = { contents, generationConfig: { maxOutputTokens: 800, temperature: 0.7 } };
    if (system) geminiBody.system_instruction = { parts: [{ text: system }] };

    const apiKey = process.env.GEMINI_API_KEY;

    // Nouveau format AQ. → utilise l'endpoint v1beta avec header Authorization
    let response;
    if (apiKey.startsWith('AQ.')) {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(geminiBody)
        }
      );
    } else {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
      );
    }

    const data = await response.json();
    console.log('Gemini status:', response.status, JSON.stringify(data).substring(0, 300));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || data?.error?.message
      || 'Pas de réponse de Gemini.';

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text }] })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text: 'Erreur: ' + e.message }] })
    };
  }
};
