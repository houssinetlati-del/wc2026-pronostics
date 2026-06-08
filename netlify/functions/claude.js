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
    const body = JSON.parse(event.body);
    const { messages, system } = body;

    // Construit le prompt complet en ajoutant le system comme premier message user
    const contents = [];

    messages.forEach(m => {
      let text = '';
      if (typeof m.content === 'string') {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        text = m.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      }
      if (text) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text }]
        });
      }
    });

    // Si pas de contenu valide
    if (contents.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: [{ type: 'text', text: 'Bonjour ! Comment puis-je t\'aider ?' }] })
      };
    }

    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
    };

    if (system) {
      geminiBody.system_instruction = { parts: [{ text: system }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data).substring(0, 500));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || data?.error?.message
      || 'Erreur Gemini — réessaie.';

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text }] })
    };
  } catch (e) {
    console.error('Error:', e.message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'text', text: 'Erreur serveur: ' + e.message }] })
    };
  }
};
