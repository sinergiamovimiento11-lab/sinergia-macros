exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        text: '',
        error: 'Falta GROQ_API_KEY en Netlify'
      }, null, 2)
    };
  }

  // Opcional: verificación rápida de función actualizada
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'groq-qwen-image-v1',
        message: 'Función activa usando Groq con qwen/qwen3.6-27b',
        model: 'qwen/qwen3.6-27b'
      }, null, 2)
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        text: '',
        error: 'Método no permitido',
        method: event.httpMethod
      }, null, 2)
    };
  }

  try {
    const { imageBase64, mimeType, prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: 'Falta prompt'
        }, null, 2)
      };
    }

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: 'Falta imageBase64'
        }, null, 2)
      };
    }

    const cleanMimeType = mimeType || 'image/jpeg';

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${cleanMimeType};base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 700,
          temperature: 0.4
        })
      }
    );

    const data = await response.json();

    const text =
      data?.choices?.[0]?.message?.content ||
      '';

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: data?.error?.message || 'Error desde Groq',
          errorType: data?.error?.type || null,
          groqStatus: response.status,
          groqOk: response.ok,
          model: 'qwen/qwen3.6-27b',
          raw: data
        }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        text: text || '',
        groqStatus: response.status,
        groqOk: response.ok,
        model: 'qwen/qwen3.6-27b'
      }, null, 2)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        text: '',
        error: err.message
      }, null, 2)
    };
  }
};
