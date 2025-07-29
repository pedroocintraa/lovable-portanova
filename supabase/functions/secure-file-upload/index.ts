import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FileUploadRequest {
  fileName: string
  fileSize: number
  mimeType: string
  fileData: string // base64 encoded
  vendaId: string
  tipoDocumento: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { fileName, fileSize, mimeType, fileData, vendaId, tipoDocumento }: FileUploadRequest = await req.json()

    console.log(`Secure file upload attempt: ${fileName} (${fileSize} bytes) by user ${user.id}`)

    // Validate file using database function
    const { data: validationResult, error: validationError } = await supabaseClient
      .rpc('validate_file_upload', {
        p_file_name: fileName,
        p_file_size: fileSize,
        p_mime_type: mimeType
      })

    if (validationError) {
      console.error('Validation error:', validationError)
      return new Response(
        JSON.stringify({ error: 'File validation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validation = validationResult[0]
    if (!validation.is_valid) {
      console.log('File validation failed:', validation.error_message)
      return new Response(
        JSON.stringify({ error: validation.error_message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Additional security checks for images
    if (mimeType.startsWith('image/')) {
      // Check for malicious patterns in file data
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:image\/svg\+xml/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
      ]
      
      const decodedData = atob(fileData)
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(decodedData)) {
          console.log('Malicious content detected in file:', fileName)
          return new Response(
            JSON.stringify({ error: 'File contains potentially malicious content' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Generate secure file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${vendaId}/${tipoDocumento}/${timestamp}-${randomSuffix}-${safeFileName}`

    // Upload to Supabase Storage
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('documentos-vendas')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save document metadata to database
    const { data: documentData, error: dbError } = await supabaseClient
      .from('documentos_venda')
      .insert({
        venda_id: vendaId,
        tipo: tipoDocumento,
        nome_arquivo: fileName,
        tipo_mime: mimeType,
        tamanho: fileSize,
        storage_path: storagePath
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      
      // Clean up uploaded file if database insert fails
      await supabaseClient.storage
        .from('documentos-vendas')
        .remove([storagePath])
      
      return new Response(
        JSON.stringify({ error: 'Failed to save document metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful upload
    await supabaseClient.rpc('log_security_event', {
      p_action: 'SECURE_FILE_UPLOAD_SUCCESS',
      p_table_name: 'documentos_venda',
      p_record_id: documentData.id,
      p_new_values: {
        fileName,
        fileSize,
        mimeType,
        vendaId,
        tipoDocumento,
        storagePath
      }
    })

    console.log(`Secure file upload successful: ${fileName} -> ${storagePath}`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId: documentData.id,
        storagePath: storagePath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Secure file upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})