import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

const toIsoDate = (value: number | string | Date) =>
  new Date(value).toISOString().split("T")[0];

const syncClientPlanState = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  clientId: string,
) => {
  const today = new Date().toISOString().split("T")[0];

  const { data: vehicles, error } = await supabaseAdmin
    .from("client_vehicles")
    .select("plan_active, plan_start, plan_end, plan_paid_at")
    .eq("client_id", clientId);

  if (error) {
    throw error;
  }

  const activeVehicles = (vehicles || []).filter(
    (vehicle) => vehicle.plan_active && vehicle.plan_end && vehicle.plan_end >= today,
  );

  if (activeVehicles.length === 0) {
    const { error: clientUpdateError } = await supabaseAdmin
      .from("clients")
      .update({ plan_active: false })
      .eq("id", clientId);

    if (clientUpdateError) {
      throw clientUpdateError;
    }

    return;
  }

  const sortedByEnd = [...activeVehicles].sort((a, b) =>
    (b.plan_end || "").localeCompare(a.plan_end || ""),
  );
  const latestVehicle = sortedByEnd[0];

  const { error: clientUpdateError } = await supabaseAdmin
    .from("clients")
    .update({
      plan_active: true,
      plan_start: latestVehicle.plan_start || today,
      plan_end: latestVehicle.plan_end,
      plan_paid_at: latestVehicle.plan_paid_at || new Date().toISOString(),
    })
    .eq("id", clientId);

  if (clientUpdateError) {
    throw clientUpdateError;
  }
};

serve(async (req) => {
  try {
    const body = await req.text();
    console.log(`Received raw webhook body, length=${body.length}`);
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (parseErr) {
      console.error('Failed to parse webhook JSON:', parseErr.message);
      return new Response(JSON.stringify({ received: true, error: 'invalid_json' }), { status: 200 });
    }
    const eventId = event.id || '(no-id)';
    console.log(`Stripe event received: ${event.type} id=${eventId}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log(`Stripe event received: ${event.type}`);

    const object = event.data?.object ?? {};
    let vehicleId = object.metadata?.vehicle_id ?? null;
    if (!vehicleId) {
      vehicleId = object.subscription ? (object.metadata?.vehicle_id ?? null) : vehicleId;
    }
    let subscription: Stripe.Subscription | null = null;

    if (object.object === "subscription") {
      subscription = object as Stripe.Subscription;
      vehicleId = vehicleId || subscription.metadata?.vehicle_id || null;
    } else if (object.subscription) {
      try {
        subscription = await stripe.subscriptions.retrieve(object.subscription);
        vehicleId = vehicleId || subscription.metadata?.vehicle_id || null;
      } catch (err) {
        console.error(`Error retrieving subscription ${object.subscription}:`, err.message);
      }
    }

    if (!vehicleId) {
      console.warn(`No vehicle_id in metadata for event ${event.type} id=${eventId}; skipping.`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
      });
    }

    // Determine if the payment is confirmed
    let isPaid = false;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || event.type === 'checkout.session.async_payment_failed') {
      isPaid = object.payment_status === "paid";
      console.log(`Checkout session status: ${object.payment_status}, isPaid: ${isPaid}`);
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      isPaid = true;
      console.log("Invoice paid, isPaid: true");
    } else {
      console.log(`Event ${event.type} not explicitly handled; isPaid remains ${isPaid}`);
    }

    // Determine subscription active state only after explicit invoice/payment confirmation.
    // Avoid trusting subscription.status alone because some payment methods (eg. boleto)
    // may create a subscription before the invoice is paid.
    let isSubscriptionActive = false;
    if (subscription) {
      try {
        // Try to inspect the latest invoice associated with the subscription
        const latestInvoiceId = (subscription.latest_invoice as any)?.id || subscription.latest_invoice;
        if (latestInvoiceId) {
          const invoice = await stripe.invoices.retrieve(latestInvoiceId as string);
          const invoiceStatus = (invoice as any).status;
          const invoicePaymentStatus = (invoice as any).payment_status || (invoice as any).paid;
          if (invoice && (invoiceStatus === 'paid' || invoicePaymentStatus === 'paid' || invoicePaymentStatus === true)) {
            isSubscriptionActive = true;
            console.log(`Subscription latest invoice ${latestInvoiceId} is paid.`);
          } else {
            console.log(`Subscription latest invoice ${latestInvoiceId} not paid: status=${invoiceStatus}, payment_status=${invoicePaymentStatus}`);
          }
        } else {
          // No latest_invoice present; do not activate based only on subscription.status
          console.log(`Subscription has no latest_invoice; subscription.status=${subscription.status}`);
        }
      } catch (err) {
        console.error("Error retrieving latest invoice for subscription:", err.message);
      }
    } else {
      isSubscriptionActive = isPaid;
    }

    console.log(`Final plan activation state: ${isSubscriptionActive} (Subscription status: ${subscription?.status}, isPaid: ${isPaid})`);

    const planStart = subscription?.current_period_start
      ? toIsoDate(subscription.current_period_start * 1000)
      : toIsoDate(new Date());
    const planEnd = subscription?.current_period_end
      ? toIsoDate(subscription.current_period_end * 1000)
      : toIsoDate(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    const planPaidAt = new Date().toISOString();

    const { data: vehicleRecord, error: vehicleFetchError } = await supabaseAdmin
      .from("client_vehicles")
      .select("id, client_id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleFetchError) {
      throw vehicleFetchError;
    }

    if (!vehicleRecord) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
      });
    }

    const vehicleUpdate: Record<string, string | boolean | null> = {
      plan_active: isSubscriptionActive,
    };

    if (isSubscriptionActive) {
      vehicleUpdate.plan_paid_at = planPaidAt;
      vehicleUpdate.plan_start = planStart;
      vehicleUpdate.plan_end = planEnd;
    }

    const { error: vehicleUpdateError } = await supabaseAdmin
      .from("client_vehicles")
      .update(vehicleUpdate)
      .eq("id", vehicleId);

    if (vehicleUpdateError) {
      throw vehicleUpdateError;
    }

    await syncClientPlanState(supabaseAdmin, vehicleRecord.client_id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook error:", message);
    return new Response(message, { status: 200 });
  }
});
