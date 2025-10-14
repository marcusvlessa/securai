import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  caseId: string;
  metrics: {
    totalCredits: number;
    totalDebits: number;
    balance: number;
    transactionCount: number;
    topCounterparties: Array<{ name: string; amount: number }>;
  };
  alerts: Array<{
    type: string;
    description: string;
    severity: string;
    score: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, metrics, alerts }: AnalysisRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Preparar contexto estruturado para IA
    const context = `
ANÁLISE FINANCEIRA COAF - CASO ${caseId}

═══════════════════════════════════════════════════════════
MÉTRICAS FINANCEIRAS
═══════════════════════════════════════════════════════════
• Créditos Totais: R$ ${metrics.totalCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Débitos Totais: R$ ${metrics.totalDebits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Saldo Final: R$ ${metrics.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Total de Transações: ${metrics.transactionCount}
• Ticket Médio: R$ ${((metrics.totalCredits + metrics.totalDebits) / metrics.transactionCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════
ALERTAS COAF DETECTADOS (${alerts.length} alertas)
═══════════════════════════════════════════════════════════
${alerts.map((a, i) => `
[${i + 1}] ${a.type.toUpperCase()} - ${a.severity.toUpperCase()}
    Descrição: ${a.description}
    Score de Risco: ${a.score}/100
`).join('\n')}

═══════════════════════════════════════════════════════════
TOP 10 CONTRAPARTES (Maior Volume)
═══════════════════════════════════════════════════════════
${metrics.topCounterparties.slice(0, 10).map((c, i) => `${i + 1}. ${c.name}: R$ ${c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')}
`;

    // Chamar Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista sênior em análise financeira forense, prevenção à lavagem de dinheiro (PLD/FT) e compliance com vasta experiência em investigações COAF.

Expertise:
- Lei 9.613/1998 (Lavagem de Dinheiro)
- Circular BACEN 3.978/2020 (PLD/FT)
- Resolução COAF 40/2021
- Técnicas de detecção de estruturação (fracionamento)
- Análise de circularidade de recursos
- Identificação de padrões fan-in/fan-out
- Perfil transacional incompatível

Seu objetivo é fornecer uma análise técnica, objetiva e acionável para investigadores.`,
          },
          {
            role: 'user',
            content: `Analise os seguintes dados financeiros e forneça um relatório estruturado conforme o modelo abaixo:

${context}

Forneça sua análise no seguinte formato:

## 1. RESUMO EXECUTIVO
[Máximo 3 parágrafos resumindo os principais achados, valores envolvidos e nível de risco geral]

## 2. ANÁLISE DE RISCO DETALHADA
[Para cada alerta detectado, explique:
- O que significa o padrão identificado
- Por que é considerado suspeito
- Qual a tipologia de lavagem de dinheiro relacionada
- Legislação/normativa aplicável]

## 3. PRINCIPAIS RISCOS IDENTIFICADOS
[Liste em bullets os 5 principais riscos em ordem de criticidade]

## 4. RECOMENDAÇÕES INVESTIGATIVAS
[Liste ações específicas que os investigadores devem tomar:
- Quais transações devem ser priorizadas
- Que contrapartes devem ser investigadas
- Quais documentos adicionais solicitar
- Medidas cautelares sugeridas]

## 5. CLASSIFICAÇÃO DE RISCO GERAL
[BAIXO | MÉDIO | ALTO | CRÍTICO]

Justificativa: [Explique em 2-3 frases por que atribuiu este nível]

## 6. PRÓXIMOS PASSOS SUGERIDOS
[3-5 ações imediatas recomendadas]

IMPORTANTE: 
- Seja técnico mas claro
- Cite artigos de lei quando relevante
- Priorize insights acionáveis
- Identifique gaps de informação
- Sugira diligências complementares`,
          },
        ],
        temperature: 0.3, // Mais determinístico para análises técnicas
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API Lovable AI:', errorText);
      console.error('Request details:', {
        model: 'google/gemini-2.5-flash',
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Erro ao chamar Lovable AI: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    const insights = aiResult.choices[0].message.content;

    console.log(`✅ Análise IA gerada com sucesso para caso ${caseId}`);

    return new Response(
      JSON.stringify({ 
        insights,
        metadata: {
          caseId,
          generatedAt: new Date().toISOString(),
          model: 'google/gemini-2.5-flash',
          alertsAnalyzed: alerts.length,
          transactionsCount: metrics.transactionCount,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na análise RIF:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        insights: `## ERRO NA GERAÇÃO DE INSIGHTS\n\nNão foi possível gerar a análise automatizada com IA.\n\nErro: ${error.message}\n\n**Prossiga com análise manual dos alertas detectados.**`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});