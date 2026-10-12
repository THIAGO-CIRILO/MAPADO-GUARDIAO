/** Kiwify sale notifications. Verify the per-webhook HMAC-SHA1 before any write. */
const encoder = new TextEncoder();
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
async function signed(token, signature, raw, parsed) {
  if (!/^[a-f0-9]{40}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(token), {name:"HMAC",hash:"SHA-1"}, false, ["sign"]);
  const wanted = signature.toLowerCase();
  let accepted = 0;
  for (const message of new Set([raw, JSON.stringify(parsed)])) {
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(message)));
    const actual = [...digest].map(b=>b.toString(16).padStart(2,"0")).join("");
    let diff=0;
    for(let i=0;i<40;i++) diff |= wanted.charCodeAt(i) ^ actual.charCodeAt(i);
    accepted |= Number(diff===0);
  }
  return accepted === 1;
}
Deno.serve(async req => {
  const secret = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
  const base = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(req.method === "GET") return json({webhook:"kiwify",status:secret&&base&&serviceKey?"ready":"not_configured"});
  if(req.method !== "POST") return json({error:"method_not_allowed"},405);
  if(!secret || !base || !serviceKey) return json({error:"not_configured"},503);
  if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))
    return json({error:"invalid_content_type"},415);
  const signature = new URL(req.url).searchParams.get("signature") || "";
  if(!/^[a-f0-9]{40}$/i.test(signature)) return json({error:"unauthorized"},401);
  const raw = await req.text();
  if(raw.length>80000) return json({error:"payload_too_large"},413);
  let body;
  try {
    body = JSON.parse(raw);
    if(!body || typeof body !== "object" || Array.isArray(body)) throw Error("bad payload");
  } catch { return json({error:"invalid_json"},400); }
  if(!(await signed(secret,signature,raw,body))) return json({error:"unauthorized"},401);
  const event = String(body.webhook_event_type||"").toLowerCase();
  const status = String(body.order_status||"").toLowerCase();
  let next = null;
  if(event==="order_approved" && status==="paid") next="paid";
  if(["order_refunded","order_chargeback","order_chargedback","chargeback"].includes(event)
      || ["refunded","chargedback","chargeback"].includes(status)) next="revoked";
  if(!next) return json({ok:true,result:"event_ignored"});
  const checkout = String(body.checkout_link||"").split("?")[0].split("/").pop();
  if(checkout!=="vT6ZxZd") return json({ok:true,result:"different_checkout"});
  const orderId = String(body.order_id||"");
  const customer = body.Customer && typeof body.Customer==="object" ? body.Customer : {};
  const product = body.Product && typeof body.Product==="object" ? body.Product : {};
  const email = String(customer.email||"").trim().toLowerCase();
  if(!orderId || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))
    return json({ok:true,result:"missing_buyer_or_order"});
  const productId = product.product_id ? String(product.product_id) : null;
  try {
    const r=await fetch(base+"/rest/v1/rpc/processar_compra_kiwify",{
      method:"POST",
      headers: {"content-type":"application/json","apikey":serviceKey,"authorization":"Bearer "+serviceKey},
      body:JSON.stringify({
        p_order_id:orderId,p_checkout_code:checkout,p_product_id:productId,
        p_email:email,p_status:next
      }),
      signal:AbortSignal.timeout(12000)
    });
    if(!r.ok) {
      console.error("kiwify_database_error",r.status);
      return json({error:"database_unavailable"},503);
    }
    return json({ok:true,result:await r.json()});
  } catch(e) {
    console.error("kiwify_handler_error",e instanceof Error?e.name:"unknown");
    return json({error:"temporary_error"},503);
  }
});