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
    const { audioData, groqApiKey } = await req.json();

    if (!audioData || !groqApiKey) {
      throw new Error('Audio data and GROQ API key are required');
    }

    console.log('🎵 Starting audio transcription...');

    // Convert base64 to blob with error handling
    let bytes: Uint8Array;
    try {
      const binaryAudio = atob(audioData);
      bytes = new Uint8Array(binaryAudio.length);
      for (let i = 0; i < binaryAudio.length; i++) {
        bytes[i] = binaryAudio.charCodeAt(i);
      }
    } catch (error) {
      throw new Error('Failed to decode audio data: Invalid base64');
    }

    if (bytes.length === 0) {
      throw new Error('Empty audio data provided');
    }

    console.log(`📊 Audio data size: ${bytes.length} bytes`);

    // Prepare form data for GROQ Whisper API
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    // Optimized settings for Portuguese
    formData.append('language', 'pt');
    formData.append('temperature', '0.1'); // Slightly higher for better quality
    formData.append('prompt', 'Transcreva o áudio em português brasileiro.');

    console.log('🚀 Sending request to GROQ API...');

    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 55000); // 55 second timeout

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GROQ API error:', response.status, errorText);
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '60';
          throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
        }
        
        throw new Error(`GROQ API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.text) {
        throw new Error('No transcription text returned from GROQ API');
      }

      const transcriptionLength = result.text.length;
      console.log(`✅ Transcription successful: ${transcriptionLength} characters - "${result.text.substring(0, 100)}..."`);

      return new Response(
        JSON.stringify({ 
          text: result.text.trim(),
          success: true,
          length: transcriptionLength
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - audio file too large or API too slow');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});