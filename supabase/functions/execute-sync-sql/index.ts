// Supabase Edge Function para ejecutar SQL de sincronización
// Permite ejecutar el SQL generado por el script de sincronización

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SQLRequest {
  sql: string
  batch_size?: number
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Crear cliente de Supabase con service_role desde el header
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sywkskwkexwwdzrbwinp.supabase.co'
    const supabaseServiceKey = authHeader.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parsear el body
    const { sql, batch_size = 50 }: SQLRequest = await req.json()

    if (!sql || !sql.trim()) {
      return new Response(
        JSON.stringify({ error: 'SQL is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Dividir SQL en statements individuales
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements in batches of ${batch_size}`)

    const results = {
      total: statements.length,
      success: 0,
      errors: 0,
      errorDetails: [] as Array<{ statement: number, error: string }>
    }

    // Ejecutar en lotes
    const batchSize = batch_size
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(statements.length / batchSize)

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} statements)`)

      for (let j = 0; j < batch.length; j++) {
        const statement = batch[j]
        const statementNumber = i + j + 1

        try {
          // Ejecutar usando RPC exec_sql (debe estar creada en PostgreSQL)
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';' // Asegurar que termine con ;
          })

          if (error) {
            console.warn(`Statement ${statementNumber} failed:`, error.message)
            results.errors++
            results.errorDetails.push({
              statement: statementNumber,
              error: error.message
            })
          } else {
            results.success++
          }
        } catch (err) {
          console.error(`Error executing statement ${statementNumber}:`, err)
          results.errors++
          results.errorDetails.push({
            statement: statementNumber,
            error: err.message || String(err)
          })
        }
      }

      // Pequeña pausa entre lotes
      if (i + batchSize < statements.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return new Response(
      JSON.stringify({ 
        success: results.errors === 0,
        results: {
          total: results.total,
          success: results.success,
          errors: results.errors,
          errorDetails: results.errorDetails.slice(0, 10) // Solo primeros 10 errores
        }
      }),
      { 
        status: results.errors === 0 ? 200 : 207, // 207 = Multi-Status
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error executing SQL:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to execute SQL' 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})




