exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
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
      })
    };
  }

  try {
    const { imageBase64, mimeType, prompt } = JSON.parse(event.body || '{}');
    const API_KEY = process.env.GROQ_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: 'Falta GROQ_API_KEY en Netlify'
        })
      };
    }

    if (!prompt) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: 'Falta prompt'
        })
      };
    }

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          text: '',
          error: 'Falta imageBase64'
        })
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
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
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
          raw: data
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        text: text || '',
        groqStatus: response.status,
        groqOk: response.ok
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        text: '',
        error: err.message
      })
    };
  }
};
