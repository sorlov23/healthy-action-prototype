import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function authenticatedUserId(req: Request): string | null {
  const header = req.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const claims = JSON.parse(atob(padded));
    if (claims?.role !== "authenticated" || !claims?.sub) return null;
    return String(claims.sub);
  } catch {
    return null;
  }
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["recognized", "needs_clarification"] },
    dish_name: { type: "string" },
    request_summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    clarifying_question: { type: "string" },
    calorie_min: { type: "integer", minimum: 0 },
    calorie_max: { type: "integer", minimum: 0 },
    portion_assumption: { type: "string" },
    decision_stage: { type: "string", enum: ["choosing", "preparing", "ready"] },
    actions_now: { type: "array", items: { type: "string" }, maxItems: 3 },
    future_tip: { type: "string" },
    decision_state: {
      type: "string",
      enum: ["fits_well", "fits_with_adjustment", "better_alternative", "needs_clarification"],
    },
    verdict_title: {
      type: "string",
      enum: ["Можно брать", "Можно, но лучше аккуратнее", "Есть вариант лучше", "Нужно уточнить"],
    },
    explanation: { type: "string" },
    context_label: { type: "string" },
    fit_text: { type: "string" },
    components: { type: "array", items: { type: "string" } },
    alternative: {
      type: "object",
      additionalProperties: false,
      properties: {
        available: { type: "boolean" },
        name: { type: "string" },
        calorie_min: { type: "integer", minimum: 0 },
        calorie_max: { type: "integer", minimum: 0 },
        changes: { type: "array", items: { type: "string" } },
      },
      required: ["available", "name", "calorie_min", "calorie_max", "changes"],
    },
  },
  required: [
    "status",
    "dish_name",
    "request_summary",
    "confidence",
    "clarifying_question",
    "calorie_min",
    "calorie_max",
    "portion_assumption",
    "decision_stage",
    "actions_now",
    "future_tip",
    "decision_state",
    "verdict_title",
    "explanation",
    "context_label",
    "fit_text",
    "components",
    "alternative",
  ],
};

function extractGeminiText(payload: any): string {
  for (const candidate of payload?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text;
    }
  }
  return "";
}


const canonicalVerdicts: Record<string, string> = {
  fits_well: "Можно брать",
  fits_with_adjustment: "Можно, но лучше аккуратнее",
  better_alternative: "Есть вариант лучше",
  needs_clarification: "Нужно уточнить",
};

function normalizeAnalysis(raw: any, requestedStage = "ready") {
  const analysis = raw && typeof raw === "object" ? raw : {};
  const modelStage = ["choosing", "preparing", "ready"].includes(analysis.decision_stage)
    ? analysis.decision_stage
    : "choosing";
  const stage = requestedStage === "auto"
    ? modelStage
    : (["choosing", "preparing", "ready"].includes(requestedStage) ? requestedStage : "ready");
  const confidence = Math.max(0, Math.min(1, Number(analysis.confidence || 0)));
  const alternative = analysis.alternative && typeof analysis.alternative === "object"
    ? analysis.alternative
    : { available: false, name: "", calorie_min: 0, calorie_max: 0, changes: [] };

  let state = [
    "fits_well",
    "fits_with_adjustment",
    "better_alternative",
    "needs_clarification",
  ].includes(analysis.decision_state)
    ? analysis.decision_state
    : "needs_clarification";

  const modelAskedForClarification = analysis.status === "needs_clarification";
  const weakRecognition = confidence < 0.58;
  const missingCalories = Number(analysis.calorie_max || 0) <= 0;

  if (modelAskedForClarification || weakRecognition || (analysis.status === "recognized" && missingCalories)) {
    state = "needs_clarification";
    analysis.status = "needs_clarification";
  }

  if (state === "better_alternative" && alternative.available !== true) {
    state = "fits_with_adjustment";
  }

  // A photo of a plated/prepared meal means the major choice is already made.
  // Do not turn a theoretical replacement into the primary CTA.
  if (stage === "ready" && state === "better_alternative") {
    state = "fits_with_adjustment";
  }

  if (stage === "ready") {
    alternative.available = false;
    alternative.name = "";
    alternative.calorie_min = 0;
    alternative.calorie_max = 0;
    alternative.changes = [];
  }

  if (state === "fits_well") {
    alternative.available = false;
    alternative.name = "";
    alternative.calorie_min = 0;
    alternative.calorie_max = 0;
    alternative.changes = [];
  }

  analysis.confidence = confidence;
  analysis.decision_stage = stage;
  analysis.actions_now = Array.isArray(analysis.actions_now)
    ? analysis.actions_now.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  analysis.future_tip = String(analysis.future_tip || "").trim();
  analysis.decision_state = state;
  analysis.verdict_title = canonicalVerdicts[state];

  if (state === "needs_clarification") {
    analysis.status = "needs_clarification";
    analysis.calorie_min = 0;
    analysis.calorie_max = 0;
    analysis.context_label = "нужно уточнение";
    analysis.fit_text = "";
    analysis.actions_now = [];
    analysis.future_tip = "";
    alternative.available = false;
    alternative.name = "";
    alternative.calorie_min = 0;
    alternative.calorie_max = 0;
    alternative.changes = [];
    if (!String(analysis.clarifying_question || "").trim()) {
      analysis.clarifying_question = "Что именно входит в блюдо или какого размера порция?";
    }
  } else {
    analysis.status = "recognized";
    analysis.clarifying_question = "";
  }

  analysis.alternative = alternative;
  return analysis;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const userId = authenticatedUserId(req);
  if (!userId) return json({ error: "authenticated_session_required" }, 401);

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) {
    return json({
      error: "vision_not_configured",
      message: "GEMINI_API_KEY is not configured for Rinlo vision.",
    }, 503);
  }

  const body = await req.json().catch(() => null);
  const question = String(body?.question || "").trim();
  const imageDataUrl = String(body?.imageDataUrl || "");
  const audioDataUrl = String(body?.audioDataUrl || "");

  const imageMatch = imageDataUrl
    ? /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(imageDataUrl)
    : null;
  const audioMatch = audioDataUrl
    ? /^data:(audio\/(?:wav|wave|x-wav|mp3|mpeg|mp4|m4a|aac|ogg|flac|webm|opus))(?:;[^,;]+)*;base64,([A-Za-z0-9+/=]+)$/i.exec(audioDataUrl)
    : null;

  if (!question && !imageDataUrl && !audioDataUrl) return json({ error: "input_required" }, 400);
  if (imageDataUrl && !imageMatch) return json({ error: "invalid_image" }, 400);
  if (audioDataUrl && !audioMatch) return json({ error: "invalid_audio" }, 400);
  if (imageDataUrl.length > 9_000_000) return json({ error: "image_too_large" }, 413);
  if (audioDataUrl.length > 16_000_000) return json({ error: "audio_too_large" }, 413);

  const imageMimeType = imageMatch
    ? (imageMatch[1].toLowerCase() === "image/jpg" ? "image/jpeg" : imageMatch[1].toLowerCase())
    : "";
  const imageBase64 = imageMatch ? imageMatch[2] : "";
  const audioMimeType = audioMatch ? audioMatch[1].toLowerCase() : "";
  const audioBase64 = audioMatch ? audioMatch[2] : "";
  const goal = String(body?.goal || "weight_loss");
  const decisionStage = ["choosing", "preparing", "ready", "auto"].includes(String(body?.decisionStage || ""))
    ? String(body.decisionStage)
    : "ready";
  const dailyTarget = Number(body?.dailyTarget || 0);
  const dayCaloriesMin = Number(body?.dayCaloriesMin || 0);
  const dayCaloriesMax = Number(body?.dayCaloriesMax || 0);

  const rawProfile = body?.profile && typeof body.profile === "object" ? body.profile : {};
  const profileGoal = ["lose","maintain","aware"].includes(String(rawProfile.goal || ""))
    ? String(rawProfile.goal)
    : null;
  const currentWeight = Number(rawProfile.currentWeight || 0) > 0 ? Number(rawProfile.currentWeight) : null;
  const targetWeight = Number(rawProfile.targetWeight || 0) > 0 ? Number(rawProfile.targetWeight) : null;
  const allowedPriorities = new Set(["satiety","calories","familiar","simplicity"]);
  const priorities = Array.isArray(rawProfile.priorities)
    ? rawProfile.priorities.map((item: unknown) => String(item)).filter((item: string) => allowedPriorities.has(item)).slice(0, 4)
    : [];
  const recentDecisionCount = Math.max(0, Math.min(100, Number(rawProfile.recentDecisionCount || 0)));
  const recentAdjustedCount = Math.max(0, Math.min(recentDecisionCount, Number(rawProfile.recentAdjustedCount || 0)));
  const recentChosenAdjustmentCount = Math.max(0, Math.min(recentDecisionCount, Number(rawProfile.recentChosenAdjustmentCount || 0)));
  const recentPattern = String(rawProfile.recentPattern || "").trim().slice(0, 240);
  const model = Deno.env.get("RINLO_DECISION_MODEL")
    || Deno.env.get("RINLO_VISION_MODEL")
    || "gemini-3.1-flash-lite";

  const systemPrompt = [
    "Ты — ядро Rinlo Decisions, помощника по выбору еды до того, как пользователь её съел.",
    "Отвечай по-русски, коротко, нейтрально и без морализаторства.",
    "Не называй еду хорошей или плохой. Не ставь диагнозы и не давай медицинских рекомендаций.",
    "Не изображай точность, которой нет: калорийность всегда диапазон и оценка, если точный состав и масса неизвестны.",
    "Профиль пользователя — это контекст, а не медицинская рекомендация и не повод высчитывать точную норму калорий.",
    "Если указан вес, используй его только вместе с явно выбранной целью как слабый контекст. Не делай выводов о здоровье, ИМТ или безопасном темпе похудения.",
    "Приоритеты пользователя — tie-breaker между равноценными вариантами, а не запреты.",
    "Поведенческий паттерн последних решений можно использовать, чтобы не повторять неудобные советы, но не превращай его в оценку поведения.",
    "Если уверенность в блюде, составе или порции недостаточна, верни status=needs_clarification,",
    "decision_state=needs_clarification и задай ровно один полезный короткий вопрос.",
    "Если блюдо распознано достаточно уверенно, оцени реалистичный диапазон калорий.",
    "Если по фото или тексту нельзя надёжно оценить порцию, скрытые соусы, масло, панировку или состав заметно меняют оценку — лучше попроси одно уточнение.",
    "Решение должно учитывать цель пользователя, уже сохранённый контекст дня и стадию решения.",
    "decision_stage=choosing: человек ещё выбирает еду — можно предлагать другую версию блюда, напиток, гарнир, размер порции.",
    "decision_stage=preparing: еда готовится — можно менять только то, что ещё реально изменить во время приготовления.",
    "decision_stage=ready: еда уже приготовлена или стоит перед человеком — НЕ предлагай выбрасывать, заменять или заново готовить основной компонент.",
    "Для ready рекомендуй только реально доступные сейчас действия: размер порции, не брать добавку, соус, хлеб, напиток, десерт или другой ещё не совершённый выбор.",
    "Если есть полезная идея вроде заменить сосиску мясом в следующий раз, помести её только в future_tip, а не в alternative.",
    "actions_now — максимум три коротких действия, которые человек действительно может сделать прямо сейчас.",
    "future_tip — необязательная одна короткая идея на следующий похожий приём пищи.",
    "request_summary — коротко и естественно сформулируй, что пользователь собирается съесть или о чём спрашивает; для аудио передай смысл речи без слов-паразитов.",
    "Если стадия передана как auto, определи choosing/preparing/ready из смысла речи. Явные слова «уже приготовил», «уже ем», «стоит передо мной» означают ready.",
    "Используй только четыре канонических статуса Rinlo и ровно такие заголовки:",
    "fits_well = «Можно брать».",
    "fits_with_adjustment = «Можно, но лучше аккуратнее».",
    "better_alternative = «Есть вариант лучше».",
    "needs_clarification = «Нужно уточнить».",
    "Не придумывай другие verdict_title: никаких «вписывается в план», «хороший выбор» и похожих формулировок.",
    "fits_well = выбор спокойно вписывается.",
    "fits_with_adjustment = идея подходит, но небольшое изменение заметно улучшит выбор.",
    "better_alternative = есть очевидно более удобная версия той же идеи.",
    "Альтернативу предлагай только если она реально полезна; иначе available=false.",
    "Если alternative.available=false, верни пустое name, 0 в calorie_min/calorie_max и пустой changes.",
  ].join(" ");

  const priorityLabels: Record<string, string> = {
    satiety: "сытность",
    calories: "калорийность",
    familiar: "привычные продукты",
    simplicity: "простота",
  };
  const profileParts = [
    profileGoal ? `явная цель: ${profileGoal}` : "",
    currentWeight ? `текущий вес: ${currentWeight} кг` : "",
    targetWeight ? `целевой вес: ${targetWeight} кг` : "",
    priorities.length ? `приоритеты: ${priorities.map((item: string) => priorityLabels[item]).join(", ")}` : "",
    recentDecisionCount ? `решений за 7 дней: ${recentDecisionCount}; требовали корректировки: ${recentAdjustedCount}; пользователь выбрал корректировку: ${recentChosenAdjustmentCount}` : "",
    recentPattern ? `наблюдаемый паттерн: ${recentPattern}` : "",
  ].filter(Boolean).join("; ");

  const userText = [
    `Цель запроса: ${goal}.`,
    profileParts ? `Персональный контекст: ${profileParts}.` : "Персональный контекст пока не задан.",
    decisionStage === "auto" ? "Стадию решения определи из запроса пользователя." : `Стадия решения: ${decisionStage}.`,
    dailyTarget > 0 ? `Персональный ориентир дня: около ${dailyTarget} ккал.` : "Персональный калорийный ориентир пока не задан.",
    `По уже сохранённым решениям Rinlo сегодня: примерно ${dayCaloriesMin}–${dayCaloriesMax} ккал.`,
    question ? `Вопрос пользователя: ${question}` : (audioDataUrl ? "Пользователь прислал голосовой вопрос о еде." : "Пользователь прислал фото еды."),
    imageDataUrl ? "Если фото и текст расходятся, не угадывай: попроси одно уточнение." : (audioDataUrl ? "Пойми смысл речи и проанализируй запрос без выдуманной точности." : "Проанализируй текстовый запрос без выдуманной точности."),
    "Верни решение строго по JSON-схеме.",
  ].join(" ");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            ...(imageDataUrl ? [{
              inlineData: {
                mimeType: imageMimeType,
                data: imageBase64,
              },
            }] : []),
            ...(audioDataUrl ? [{
              inlineData: {
                mimeType: audioMimeType,
                data: audioBase64,
              },
            }] : []),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(
      "Gemini decision request failed",
      response.status,
      payload?.error?.status || payload?.error?.code || "",
    );
    return json({
      error: "vision_provider_error",
      status: response.status,
      code: payload?.error?.status || payload?.error?.code || null,
    }, 502);
  }

  const outputText = extractGeminiText(payload);
  if (!outputText) {
    const finishReason = payload?.candidates?.[0]?.finishReason || null;
    return json({ error: "empty_vision_response", finishReason }, 502);
  }

  let analysis;
  try {
    analysis = normalizeAnalysis(JSON.parse(outputText), decisionStage);
  } catch {
    return json({ error: "invalid_vision_response" }, 502);
  }

  if (analysis.calorie_max < analysis.calorie_min) {
    [analysis.calorie_min, analysis.calorie_max] = [analysis.calorie_max, analysis.calorie_min];
  }
  if (analysis.alternative?.calorie_max < analysis.alternative?.calorie_min) {
    [analysis.alternative.calorie_min, analysis.alternative.calorie_max] = [
      analysis.alternative.calorie_max,
      analysis.alternative.calorie_min,
    ];
  }

  return json({
    analysis,
    meta: {
      model,
      provider: "google-gemini",
      userId,
    },
  });
});
