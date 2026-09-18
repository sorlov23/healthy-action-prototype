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
    confidence: { type: "number", minimum: 0, maximum: 1 },
    clarifying_question: { type: "string" },
    calorie_min: { type: "integer", minimum: 0 },
    calorie_max: { type: "integer", minimum: 0 },
    portion_assumption: { type: "string" },
    decision_state: {
      type: "string",
      enum: ["fits_well", "fits_with_adjustment", "better_alternative", "needs_clarification"],
    },
    verdict_title: { type: "string" },
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
    "confidence",
    "clarifying_question",
    "calorie_min",
    "calorie_max",
    "portion_assumption",
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
  const imageDataUrl = String(body?.imageDataUrl || "");
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(imageDataUrl);
  if (!match) return json({ error: "invalid_image" }, 400);
  if (imageDataUrl.length > 9_000_000) return json({ error: "image_too_large" }, 413);

  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const imageBase64 = match[2];
  const goal = String(body?.goal || "weight_loss");
  const dailyTarget = Number(body?.dailyTarget || 2000);
  const dayCaloriesMin = Number(body?.dayCaloriesMin || 0);
  const dayCaloriesMax = Number(body?.dayCaloriesMax || 0);
  const model = Deno.env.get("RINLO_VISION_MODEL") || "gemini-2.5-flash-lite";

  const systemPrompt = [
    "Ты — ядро Rinlo Decisions, помощника по выбору еды до того, как пользователь её съел.",
    "Отвечай по-русски, коротко, нейтрально и без морализаторства.",
    "Не называй еду хорошей или плохой. Не ставь диагнозы и не давай медицинских рекомендаций.",
    "Не изображай точность, которой нет: калорийность по фото всегда диапазон и оценка.",
    "Если уверенность в блюде, составе или порции недостаточна, верни status=needs_clarification,",
    "decision_state=needs_clarification и задай ровно один полезный короткий вопрос.",
    "Если блюдо распознано достаточно уверенно, оцени реалистичный диапазон калорий.",
    "Решение должно учитывать цель пользователя и уже сохранённый контекст дня.",
    "fits_well = выбор спокойно вписывается.",
    "fits_with_adjustment = идея подходит, но небольшое изменение заметно улучшит выбор.",
    "better_alternative = есть очевидно более удобная версия той же идеи.",
    "Альтернативу предлагай только если она реально полезна; иначе available=false.",
    "Если alternative.available=false, верни пустое name, 0 в calorie_min/calorie_max и пустой changes.",
  ].join(" ");

  const userText = [
    `Цель: ${goal}.`,
    `Ориентир дня: около ${dailyTarget} ккал.`,
    `По уже сохранённым решениям Rinlo сегодня: примерно ${dayCaloriesMin}–${dayCaloriesMax} ккал.`,
    "Проанализируй фото предполагаемой еды и верни решение строго по JSON-схеме.",
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
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
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
      "Gemini vision request failed",
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
    analysis = JSON.parse(outputText);
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
