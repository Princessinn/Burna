import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting cleanup process...')

    // Clean up expired messages
    const { error: messagesError } = await supabase.rpc('delete_expired_messages')
    if (messagesError) {
      console.error('Error cleaning up messages:', messagesError)
    } else {
      console.log('Expired messages cleaned up successfully')
    }

    // Clean up expired and terminated chats
    const { error: chatsError } = await supabase.rpc('delete_expired_chats')
    if (chatsError) {
      console.error('Error cleaning up chats:', chatsError)
    } else {
      console.log('Expired chats cleaned up successfully')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cleanup completed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})