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
        version: 'debug-models-v3',
        error: 'Falta GROQ_API_KEY en Netlify'
      }, null, 2)
    };
  }

  // =====================================================
  // SIEMPRE QUE TENGA ?models=1, LISTA MODELOS
  // SIN IMPORTAR SI ES GET O POST
  // =====================================================
  if (event.queryStringParameters?.models === '1') {
    try {
      const modelsResponse = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const modelsData = await modelsResponse.json();
      const models = modelsData?.data?.map(model => model.id) || [];

      const possibleVisionModels = models.filter(id => {
        const lower = id.toLowerCase();
        return (
          lower.includes('vision') ||
          lower.includes('scout') ||
          lower.includes('maverick') ||
          lower.includes('llama-4') ||
          lower.includes('vl') ||
          lower.includes('multimodal')
        );
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          version: 'debug-models-v3',
          mode: 'models',
          method: event.httpMethod,
          ok: modelsResponse.ok,
          status: modelsResponse.status,
          totalModels: models.length,
          possibleVisionModels,
          allModels: models,
          raw: modelsData
        }, null, 2)
      };

    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          version: 'debug-models-v3',
          mode: 'models',
          error: err.message
        }, null, 2)
      };
    }
  }

  // =====================================================
  // SI ES GET SIN ?models=1, DEVUELVE INSTRUCCIONES
  // =====================================================
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'debug-models-v3',
        message: 'La función está actualizada. Para listar modelos abre esta misma URL con ?models=1',
        useThisUrl: '/.netlify/functions/gemini?models=1',
        method: event.httpMethod,
        query: event.queryStringParameters || {}
      }, null, 2)
    };
  }

  // =====================================================
  // ANÁLISIS DE IMAGEN
  // =====================================================
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'debug-models-v3',
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
          version: 'debug-models-v3',
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
          version: 'debug-models-v3',
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
          model: 'llama-3.2-11b-vision-preview',
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

    const text = data?.choices?.[0]?.message?.content || '';

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          version: 'debug-models-v3',
          text: '',
          error: data?.error?.message || 'Error desde Groq',
          errorType: data?.error?.type || null,
          groqStatus: response.status,
          groqOk: response.ok,
          raw: data
        }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'debug-models-v3',
        text: text || '',
        groqStatus: response.status,
        groqOk: response.ok
      }, null, 2)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'debug-models-v3',
        text: '',
        error: err.message
      }, null, 2)
    };
  }
};
