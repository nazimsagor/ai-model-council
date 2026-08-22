const SANDBOX_INIT_URL = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
const LIVE_INIT_URL = "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
const SANDBOX_VALIDATION_URL = "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
const LIVE_VALIDATION_URL = "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

function isLive() {
  return process.env.SSLCZ_IS_LIVE === "true";
}

function credentials() {
  const store_id = process.env.SSLCZ_STORE_ID;
  const store_passwd = process.env.SSLCZ_STORE_PASSWORD;
  if (!store_id || !store_passwd) {
    throw new Error("SSLCZ_STORE_ID and SSLCZ_STORE_PASSWORD must be set.");
  }
  return { store_id, store_passwd };
}

export interface InitSessionParams {
  tran_id: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

/** Starts an SSLCommerz payment session and returns the URL to redirect the
 *  browser to. Digital/non-physical product profile, so shipping fields are
 *  filled with placeholders SSLCommerz still requires but doesn't use. */
export async function initSession(params: InitSessionParams): Promise<{ GatewayPageURL: string }> {
  const { store_id, store_passwd } = credentials();
  const body = new URLSearchParams({
    store_id,
    store_passwd,
    total_amount: params.amount.toFixed(2),
    currency: "BDT",
    tran_id: params.tran_id,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    shipping_method: "NO",
    product_name: "AI Model Council subscription",
    product_category: "Digital Subscription",
    product_profile: "non-physical-goods",
    cus_name: params.customerName,
    cus_email: params.customerEmail,
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: "N/A",
  });

  const res = await fetch(isLive() ? LIVE_INIT_URL : SANDBOX_INIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(data.failedreason || "Failed to start SSLCommerz session");
  }
  return { GatewayPageURL: data.GatewayPageURL as string };
}

export interface ValidationResult {
  valid: boolean;
  amount: number;
  tran_id: string;
  card_type?: string;
}

/** Server-to-server check with SSLCommerz that a val_id from a
 *  success/IPN callback is real — callbacks themselves are unauthenticated
 *  form posts and must never be trusted on their own. */
export async function validateTransaction(val_id: string): Promise<ValidationResult> {
  const { store_id, store_passwd } = credentials();
  const url = new URL(isLive() ? LIVE_VALIDATION_URL : SANDBOX_VALIDATION_URL);
  url.searchParams.set("val_id", val_id);
  url.searchParams.set("store_id", store_id);
  url.searchParams.set("store_passwd", store_passwd);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  const data = await res.json();
  const valid = data.status === "VALID" || data.status === "VALIDATED";
  return {
    valid,
    amount: parseFloat(data.amount ?? "0"),
    tran_id: data.tran_id,
    card_type: data.card_type,
  };
}
