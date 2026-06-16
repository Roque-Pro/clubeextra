import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno&no-check";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error("Missing STRIPE_SECRET_KEY");
      throw new Error("Configuração do servidor incompleta: STRIPE_SECRET_KEY não encontrada.");
    }

    const { vehicleId, priceId, successUrl, cancelUrl } = await req.json();

    if (!vehicleId || !priceId) {
      throw new Error("vehicleId and priceId are required");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Não autorizado");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log(`Creating checkout session for user ${user.email} and price ${priceId}`);

    // Check if customer already exists for this user email
    const customers = await stripe.customers.list({ email: user.email });
    let customerId = customers.data.length > 0 ? customers.data[0].id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        vehicle_id: vehicleId,
        user_id: user.id
      },
      subscription_data: {
        metadata: {
          vehicle_id: vehicleId,
          user_id: user.id
        }
      }
    });

    console.log("Checkout session created successfully:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating checkout session:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
