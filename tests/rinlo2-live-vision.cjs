const fs = require('fs');

function readRuntimeConfig() {
  const src = fs.readFileSync('runtime-config.js', 'utf8');
  const url = src.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
  const key = src.match(/supabasePublishableKey:\s*'([^']+)'/)?.[1];
  if (!url || !key) throw new Error('supabase_runtime_config_missing');
  return { url: url.replace(/\/+$/, ''), key };
}

async function jsonResponse(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return { raw: text }; }
}

(async () => {
  const { url, key } = readRuntimeConfig();

  const signup = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      data: { client: 'rinlo-live-vision-ci', schema_version: 1 },
      gotrue_meta_security: { captcha_token: null },
    }),
  });
  const session = await jsonResponse(signup);
  if (!signup.ok || !session?.access_token || !session?.user?.id) {
    throw new Error(`anonymous_signup_failed:${signup.status}:${JSON.stringify(session)}`);
  }

  // Valid 1x1 PNG. The expected useful outcome for an ambiguous image is
  // needs_clarification, but recognized is also accepted if the provider
  // returns a schema-valid response.
  const imageDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2VZsAAAAASUVORK5CYII=';

  const vision = await fetch(`${url}/functions/v1/analyze-food`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      imageDataUrl,
      goal: 'weight_loss',
      decisionStage: 'ready',
      dailyTarget: 0,
      dayCaloriesMin: 0,
      dayCaloriesMax: 0,
    }),
  });

  const payload = await jsonResponse(vision);
  if (!vision.ok) {
    throw new Error(`vision_call_failed:${vision.status}:${JSON.stringify(payload)}`);
  }

  if (payload?.meta?.provider !== 'google-gemini') {
    throw new Error(`unexpected_provider:${JSON.stringify(payload?.meta || {})}`);
  }
  if (!String(payload?.meta?.model || '').startsWith('gemini-')) {
    throw new Error(`unexpected_model:${JSON.stringify(payload?.meta || {})}`);
  }
  if (!['recognized', 'needs_clarification'].includes(payload?.analysis?.status)) {
    throw new Error(`invalid_analysis_status:${JSON.stringify(payload?.analysis || {})}`);
  }
  if (payload?.analysis?.decision_stage !== 'ready') {
    throw new Error(`unexpected_decision_stage:${JSON.stringify(payload?.analysis || {})}`);
  }
  if (!Array.isArray(payload?.analysis?.actions_now) || typeof payload?.analysis?.future_tip !== 'string') {
    throw new Error(`missing_stage_guidance:${JSON.stringify(payload?.analysis || {})}`);
  }
  if (!['fits_well','fits_with_adjustment','better_alternative','needs_clarification'].includes(payload?.analysis?.decision_state)) {
    throw new Error(`invalid_decision_state:${JSON.stringify(payload?.analysis || {})}`);
  }

  const canonicalVerdicts = {
    fits_well: 'Можно брать',
    fits_with_adjustment: 'Можно, но лучше аккуратнее',
    better_alternative: 'Есть вариант лучше',
    needs_clarification: 'Нужно уточнить',
  };
  if (payload?.analysis?.verdict_title !== canonicalVerdicts[payload.analysis.decision_state]) {
    throw new Error(`noncanonical_verdict:${JSON.stringify(payload?.analysis || {})}`);
  }

  console.log('RINLO_LIVE_VISION_RESULT=PASS');
  console.log(JSON.stringify({
    provider: payload.meta.provider,
    model: payload.meta.model,
    status: payload.analysis.status,
    decisionState: payload.analysis.decision_state,
    decisionStage: payload.analysis.decision_stage,
    actionsNow: payload.analysis.actions_now,
    futureTip: payload.analysis.future_tip,
    confidence: payload.analysis.confidence,
    dishName: payload.analysis.dish_name,
    clarifyingQuestion: payload.analysis.clarifying_question,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
