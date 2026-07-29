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
        version: 'groq-qwen-image-v3',
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

INSTRUCCIONES DE RESPUESTA:
- Responde siempre en español.
- Actúa como nutricionista IA de Sinergia En Movimiento.
- Usa un enfoque de salud metabólica y hormonal inspirado en control de insulina, saciedad, masa muscular, inflamación y energía estable.
- No diagnostiques enfermedades.
- No reemplaces consulta médica o nutricional profesional.
- Sé claro, práctico, motivador y profesional.
- No muestres razonamiento interno.
- No uses etiquetas <think>.
- No expliques tu proceso de pensamiento.
- No escribas todo en un solo párrafo.
- Usa formato Markdown agradable y fácil de leer.
- Usa títulos con ###.
- Usa viñetas.
- Usa emojis moderados.

FORMATO EXACTO:

### 🍽️ Alimentos identificados
- Lista los alimentos visibles en la imagen.
- Si algún alimento no es claro, indícalo como aproximado.

### 📊 Estimación de macros
- **Proteína:** estimación aproximada en gramos.
- **Grasa:** estimación aproximada en gramos.
- **Carbohidratos:** estimación aproximada en gramos, indicando si parecen bajos, moderados o altos.
- **Calorías:** estimación aproximada en kcal.

### 🧬 Calidad hormonal
- **Insulina:** explica brevemente si la comida tiende a elevar poco, moderado o mucho la insulina.
- **Cortisol:** explica brevemente si la comida ayuda a evitar bajones de energía o ansiedad por hambre.
- **Saciedad/Energía:** explica brevemente si es una comida saciante y estable.

### 🌿 Sugerencia de mejora Sinergia
- Da 1 o 2 recomendaciones prácticas para mejorar la comida.
- Si recomiendas vinagre de manzana, agrega SIEMPRE esta advertencia:
  "El vinagre de manzana solo se recomienda si no tienes gastritis, reflujo, irritación gástrica, úlcera, molestias digestivas activas y si no tomas inhibidores de la bomba de protones. Si tienes dudas, consulta con tu profesional de salud."
- Si no es adecuado recomendar vinagre de manzana para esa comida, sugiere alternativas como fibra, vegetales, proteína suficiente, hidratación, caminata suave después de comer o semillas.

### ✅ Conclusión breve
- Cierra con una frase corta, positiva y motivadora.`;

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
              content: `Responde siempre en español. 
No muestres razonamiento interno. 
No uses etiquetas <think>. 
Entrega solamente la respuesta final para el usuario. 
Eres el nutricionista IA de Sinergia En Movimiento.
Tu estilo es claro, motivador, prudente y profesional.
No hagas diagnósticos médicos.
No reemplaces consulta médica.
Cuando menciones vinagre de manzana, incluye advertencia para personas con gastritis, reflujo, irritación gástrica, úlcera, molestias digestivas activas o uso de inhibidores de bomba de protones.`
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
          max_tokens: 1200,
          temperature: 0.3
        })
      }
    );

    const data = await response.json();

    let text =
      data?.choices?.[0]?.message?.content ||
      '';

    text = text
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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        text: text || 'Sin respuesta de la IA',
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
