// Supabase Edge Function: send-email
// Deploy with: supabase functions deploy send-email
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — Your Resend.com API key
//   SENDER_EMAIL    — Verified sender email (e.g., notifications@yourdomain.com)
//
// Alternatively, you can use any SMTP provider by adapting the fetch call.

// Deno types are available in Supabase Edge runtime only
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'WorkTracker <onboarding@resend.dev>';
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, html } = (await req.json()) as EmailPayload;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — logging email instead of sending');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML length: ${html.length} chars`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email logged (RESEND_API_KEY not configured)',
          id: crypto.randomUUID(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
