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
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
          max_tokens: 500
        })
      }
    );

    const data = await response.json();

    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.reasoning ||
      '';

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        text,
        groqStatus: response.status,
        groqOk: response.ok,
        mimeTypeReceived: cleanMimeType,
        imageBase64Length: imageBase64.length,
        error: data?.error?.message || null,
        errorType: data?.error?.type || null,
        raw: data
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        text: '',
        error: err.message,
        stack: err.stack
      })
    };
  }
};

