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


function silentWavDataUrl(durationSeconds = 0.35, sampleRate = 8000) {
  const samples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${buffer.toString('base64')}`;
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

  const textDecision = await fetch(`${url}/functions/v1/analyze-food`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      question: 'Можно сегодня бургер и колу? Я ещё выбираю, что съесть.',
      goal: 'weight_loss',
      profile: {
        goal: 'lose',
        currentWeight: 80,
        targetWeight: 72,
        priorities: ['satiety','simplicity'],
        recentDecisionCount: 4,
        recentAdjustedCount: 2,
        recentChosenAdjustmentCount: 1,
        recentPattern: 'Чаще всего помогает корректировать напиток.',
      },
      decisionStage: 'choosing',
      dailyTarget: 0,
      dayCaloriesMin: 0,
      dayCaloriesMax: 0,
    }),
  });

  const textPayload = await jsonResponse(textDecision);
  if (!textDecision.ok) {
    throw new Error(`text_decision_call_failed:${textDecision.status}:${JSON.stringify(textPayload)}`);
  }
  if (textPayload?.meta?.provider !== 'google-gemini') {
    throw new Error(`text_unexpected_provider:${JSON.stringify(textPayload?.meta || {})}`);
  }
  if (textPayload?.analysis?.decision_stage !== 'choosing') {
    throw new Error(`text_unexpected_stage:${JSON.stringify(textPayload?.analysis || {})}`);
  }
  if (!['recognized','needs_clarification'].includes(textPayload?.analysis?.status)) {
    throw new Error(`text_invalid_status:${JSON.stringify(textPayload?.analysis || {})}`);
  }
  if (textPayload?.analysis?.verdict_title !== canonicalVerdicts[textPayload.analysis.decision_state]) {
    throw new Error(`text_noncanonical_verdict:${JSON.stringify(textPayload?.analysis || {})}`);
  }

  const audioDecision = await fetch(`${url}/functions/v1/analyze-food`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      audioDataUrl: silentWavDataUrl(),
      goal: 'weight_loss',
      decisionStage: 'auto',
      dailyTarget: 0,
      dayCaloriesMin: 0,
      dayCaloriesMax: 0,
    }),
  });

  const audioPayload = await jsonResponse(audioDecision);
  if (!audioDecision.ok) {
    throw new Error(`audio_decision_call_failed:${audioDecision.status}:${JSON.stringify(audioPayload)}`);
  }
  if (audioPayload?.meta?.provider !== 'google-gemini') {
    throw new Error(`audio_unexpected_provider:${JSON.stringify(audioPayload?.meta || {})}`);
  }
  if (!['recognized','needs_clarification'].includes(audioPayload?.analysis?.status)) {
    throw new Error(`audio_invalid_status:${JSON.stringify(audioPayload?.analysis || {})}`);
  }
  if (!['choosing','preparing','ready'].includes(audioPayload?.analysis?.decision_stage)) {
    throw new Error(`audio_invalid_stage:${JSON.stringify(audioPayload?.analysis || {})}`);
  }
  if (typeof audioPayload?.analysis?.request_summary !== 'string') {
    throw new Error(`audio_missing_request_summary:${JSON.stringify(audioPayload?.analysis || {})}`);
  }
  if (audioPayload?.analysis?.verdict_title !== canonicalVerdicts[audioPayload.analysis.decision_state]) {
    throw new Error(`audio_noncanonical_verdict:${JSON.stringify(audioPayload?.analysis || {})}`);
  }


  const cookDecision = await fetch(`${url}/functions/v1/analyze-food`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      mode: 'cook',
      ingredients: ['Куриное филе', 'Яйца', 'Сыр'],
      staples: [],
      priority: 'fast',
      profile: {
        goal: 'lose',
        priorities: ['satiety', 'simplicity'],
      },
      recentCookOutcomes: [],
    }),
  });

  const cookPayload = await jsonResponse(cookDecision);
  if (!cookDecision.ok) {
    throw new Error(`cook_decision_call_failed:${cookDecision.status}:${JSON.stringify(cookPayload)}`);
  }
  if (cookPayload?.meta?.mode !== 'cook' || cookPayload?.meta?.provider !== 'google-gemini') {
    throw new Error(`cook_unexpected_meta:${JSON.stringify(cookPayload?.meta || {})}`);
  }
  const cookPrimary = cookPayload?.cook?.primary;
  if (!cookPrimary?.name || !Array.isArray(cookPrimary?.steps) || cookPrimary.steps.length < 3) {
    throw new Error(`cook_primary_invalid:${JSON.stringify(cookPayload?.cook || {})}`);
  }
  if (!Array.isArray(cookPayload?.cook?.alternatives) || cookPayload.cook.alternatives.length !== 2) {
    throw new Error(`cook_alternatives_invalid:${JSON.stringify(cookPayload?.cook || {})}`);
  }
  if (!cookPrimary.steps.every((step) => step?.title && step?.instruction)) {
    throw new Error(`cook_steps_not_actionable:${JSON.stringify(cookPrimary.steps)}`);
  }
  const allowedCookIngredients = new Set(['куриное филе', 'яйца', 'сыр']);
  if (!(cookPrimary.ingredients_used || []).every((item) => allowedCookIngredients.has(String(item).toLowerCase()))) {
    throw new Error(`cook_invented_ingredient:${JSON.stringify(cookPrimary.ingredients_used)}`);
  }
  if ((cookPrimary.assumed_staples || []).length !== 0) {
    throw new Error(`cook_invented_staples:${JSON.stringify(cookPrimary.assumed_staples)}`);
  }

  const nutrition = cookPrimary?.nutrition;
  if (!nutrition
      || !(nutrition.calorie_max >= nutrition.calorie_min && nutrition.calorie_min > 0)
      || !(nutrition.protein_max >= nutrition.protein_min)
      || !(nutrition.fat_max >= nutrition.fat_min)
      || !(nutrition.carbs_max >= nutrition.carbs_min)
      || !String(nutrition.assumption || '').trim()) {
    throw new Error(`cook_nutrition_invalid:${JSON.stringify(nutrition || {})}`);
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
    textProbe: {
      status: textPayload.analysis.status,
      decisionState: textPayload.analysis.decision_state,
      verdict: textPayload.analysis.verdict_title,
    },
    audioProbe: {
      status: audioPayload.analysis.status,
      decisionStage: audioPayload.analysis.decision_stage,
      requestSummary: audioPayload.analysis.request_summary,
      verdict: audioPayload.analysis.verdict_title,
    },
    cookProbe: {
      name: cookPayload.cook.primary.name,
      duration: cookPayload.cook.primary.duration_minutes,
      ingredientsUsed: cookPayload.cook.primary.ingredients_used,
      steps: cookPayload.cook.primary.steps.map((step) => step.title),
      nutrition: cookPayload.cook.primary.nutrition,
    },
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
