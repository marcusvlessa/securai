import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, groqApiKey } = await req.json();

    if (!imageBase64 || !groqApiKey) {
      throw new Error('Image data and GROQ API key are required');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-90b-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise forense de imagens. Analise a imagem e forneça informações detalhadas sobre: 1) Descrição geral da cena, 2) Pessoas presentes e características, 3) Objetos importantes, 4) Localização/ambiente, 5) Relevância investigativa. Seja preciso e detalhado.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem para fins investigativos e forneça uma classificação detalhada:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error:', errorText);
      throw new Error(`GROQ API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const classification = result.choices[0]?.message?.content || 'Unable to classify image';
    
    console.log('Image classification successful:', classification.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({ 
        classification,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});