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

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        version: 'groq-qwen-image-v5',
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

    const enhancedPrompt = `${prompt}

Responde SOLO con el resultado final, en español, sin <think> y sin razonamiento interno.

Formato obligatorio y breve:

### 🍽️ Alimentos identificados
- Máximo 4 viñetas.

### 📊 Estimación de macros
- **Proteína:** ___ g
- **Grasa:** ___ g
- **Carbohidratos:** ___ g
- **Calorías:** ___ kcal

### 🧬 Calidad hormonal
- **Insulina:** 1 frase.
- **Cortisol:** 1 frase.
- **Saciedad/Energía:** 1 frase.

### 🌿 Sugerencia de mejora Sinergia
- 1 recomendación principal.
- Si mencionas vinagre de manzana, añade: "Solo si no tienes gastritis, reflujo, irritación gástrica, úlcera, molestias digestivas activas y si no tomas inhibidores de la bomba de protones. Si tienes dudas, consulta con tu profesional de salud."

### ✅ Conclusión breve
- 1 frase motivadora.`;

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
              role: 'system',
              content: 'Eres el nutricionista IA de Sinergia En Movimiento. Responde en español, claro, profesional y motivador. No muestres razonamiento interno. No uses etiquetas <think>. No diagnostiques enfermedades. Debes completar siempre las 5 secciones solicitadas, aunque sea de forma breve.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: enhancedPrompt
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
          max_tokens: 2500,
          temperature: 0.2
        })
      }
    );

    const data = await response.json();

    let text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.output_text ||
      data?.content ||
      '';

    if (Array.isArray(text)) {
      text = text
        .map(item => item?.text || item?.content || '')
        .join('\n');
    }

    text = String(text)
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .replace(/<\/think>/gi, '')
      .trim();

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

    if (!text) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          text: 'Sin respuesta de la IA',
          warning: 'Groq respondió OK, pero no se encontró texto en la respuesta.',
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
        text,
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
        error: err.message,
        stack: err.stack
      }, null, 2)
    };
  }
};
