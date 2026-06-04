// Netlify Function — keeps the Anthropic API key server-side.
// Set ANTHROPIC_API_KEY in Netlify: Site configuration → Environment variables.

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { model, max_tokens, system, messages } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages is required' }, { status: 400 });
    }

    // Only forward the fields the companion uses — nothing else passes through.
    const payload = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: Math.min(Number(max_tokens) || 1000, 2000),
      system: typeof system === 'string' ? system : '',
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '')
      }))
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    return Response.json({ error: 'Upstream request failed' }, { status: 500 });
  }
};

// Serve this function at /api/analyze so index.html needs no changes.
export const config = { path: '/api/analyze' };
