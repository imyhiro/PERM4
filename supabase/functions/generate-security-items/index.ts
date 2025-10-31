import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface GenerateRequest {
  site_id: string
  site_name: string
  industry_type: string
  location_type: string
  location_country: string
  user_id: string
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Parse request
    const {
      site_id,
      site_name,
      industry_type,
      location_type,
      location_country,
      user_id,
    }: GenerateRequest = await req.json()

    console.log(`[START] Generating for: ${site_name} (${industry_type})`)
    console.log(`Site ID: ${site_id}, User ID: ${user_id}`)

    // Call OpenAI API
    console.log('[OPENAI] Calling API...')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de riesgos de seguridad física. Tu tarea es generar listas COMPLETAS de activos y amenazas. DEBES generar MÍNIMO 18 activos y 12 amenazas. Responde SOLO con JSON válido, sin texto adicional.'
          },
          {
            role: 'user',
            content: `Genera activos y amenazas para:

SITIO: ${site_name}
INDUSTRIA: ${industry_type}
UBICACIÓN: ${location_type}
PAÍS: ${location_country}

INSTRUCCIONES OBLIGATORIAS:
1. Genera EXACTAMENTE 18 activos (mínimo)
2. Genera EXACTAMENTE 12 amenazas (mínimo)
3. Usa español
4. Solo seguridad FÍSICA (NO ciberseguridad)
5. Sé genérico para la industria "${industry_type}"
6. Trata de ampliar tu búsqueda

CATEGORÍAS DE ACTIVOS (distribuye entre):
- Personas: Empleados, visitantes, contratistas, personal clave
- Bienes: Instalaciones, equipos, vehículos, materiales
- Procesos: Operaciones críticas, procedimientos esenciales
- Información: Documentos físicos, registros, planos

CATEGORÍAS DE AMENAZAS (distribuye entre):
- Naturales: Sismos, inundaciones, incendios, clima extremo
- Tecnológicas: Fallas eléctricas, incendios, explosiones, fallas de equipos
- Sociales: Robos, vandalismo, manifestaciones, accidentes laborales

Responde SOLO con este JSON (sin \`\`\`json ni texto adicional):
{
  "assets": [
    {"name": "Nombre", "type": "Personas|Bienes|Procesos|Información", "description": "Descripción específica", "value": "critical|high|medium|low"},
    ... (MÍNIMO 20 items)
  ],
  "threats": [
    {"name": "Nombre", "category": "Naturales|Tecnológicas|Sociales", "description": "Descripción específica", "probability": "high|medium|low", "impact": "high|medium|low"},
    ... (MÍNIMO 20 items)
  ]
}`
          },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('[OPENAI] Error response:', errorText)
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('[OPENAI] Response received')

    const aiContent = openaiData.choices[0].message.content
    console.log('[PARSE] AI Content length:', aiContent.length)

    // Parse JSON response from Claude
    let parsedData
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent
      parsedData = JSON.parse(jsonString)
      console.log('[PARSE] Success - Assets:', parsedData.assets?.length, 'Threats:', parsedData.threats?.length)
    } catch (e) {
      console.error('[PARSE] Failed to parse:', aiContent.substring(0, 500))
      throw new Error(`AI response was not valid JSON: ${e.message}`)
    }

    // Initialize Supabase client with SERVICE ROLE KEY (bypasses RLS)
    console.log('[SUPABASE] Initializing client...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Insert assets
    console.log('[DB] Preparing to insert', parsedData.assets.length, 'assets...')
    const assetsToInsert = parsedData.assets.map((asset: any) => ({
      site_id,
      name: asset.name,
      type: asset.type,
      description: asset.description,
      value: asset.value || 'medium',
      location: site_name,
      owner: '',
      status: 'operational',
      created_by: user_id,
    }))

    const { data: insertedAssets, error: assetsError } = await supabase
      .from('assets')
      .insert(assetsToInsert)
      .select()

    if (assetsError) {
      console.error('[DB] Error inserting assets:', JSON.stringify(assetsError))
      throw new Error(`Failed to insert assets: ${assetsError.message}`)
    }
    console.log('[DB] Successfully inserted', insertedAssets?.length, 'assets')

    // Insert threats
    console.log('[DB] Preparing to insert', parsedData.threats.length, 'threats...')
    const threatsToInsert = parsedData.threats.map((threat: any) => ({
      site_id,
      name: threat.name,
      category: threat.category,
      description: threat.description,
      probability: threat.probability || 'medium',
      impact: threat.impact || 'medium',
      risk_level: calculateRiskLevel(threat.probability, threat.impact),
      mitigation_measures: '',
      status: 'active',
      created_by: user_id,
    }))

    const { data: insertedThreats, error: threatsError } = await supabase
      .from('threats')
      .insert(threatsToInsert)
      .select()

    if (threatsError) {
      console.error('[DB] Error inserting threats:', JSON.stringify(threatsError))
      throw new Error(`Failed to insert threats: ${threatsError.message}`)
    }
    console.log('[DB] Successfully inserted', insertedThreats?.length, 'threats')

    const result = {
      success: true,
      assets_added: insertedAssets?.length || 0,
      threats_added: insertedThreats?.length || 0,
      site_name,
      industry_type,
      source: 'ai_generated',
    }

    console.log('[SUCCESS]', JSON.stringify(result))

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[ERROR]', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('[ERROR] Stack:', errorStack)

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function calculateRiskLevel(probability: string, impact: string): string {
  const levels = { high: 3, medium: 2, low: 1 }
  const score = (levels[probability as keyof typeof levels] || 2) * (levels[impact as keyof typeof levels] || 2)

  if (score >= 6) return 'critical'
  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}
