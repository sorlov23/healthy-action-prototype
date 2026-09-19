(() => {
  const config = window.HEALTHY_ACTION_CONFIG || {};
  const auth = window.RinloSupabaseAuth;
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const params = new URLSearchParams(location.search);
  const localOnly = params.get('local') === '1';
  const enabled = !localOnly && Boolean(auth?.enabled && base && publishableKey);
  let providerUnavailable = false;

  function error(message, code, status) {
    const value = new Error(message);
    value.code = code || null;
    value.status = status || null;
    return value;
  }

  function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || error('file_read_failed'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  }

  async function compressImage(file) {
    if (!file?.type?.startsWith('image/')) throw error('invalid_image', 'invalid_image', 400);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    try {
      img.src = objectUrl;
      if (typeof img.decode === 'function') await img.decode();
      else await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;
      if (!sourceWidth || !sourceHeight) throw error('invalid_image_dimensions', 'invalid_image', 400);

      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw error('canvas_unavailable');
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      );
      if (!blob) throw error('image_compression_failed');
      return readAsDataUrl(blob);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }


  async function analyzeIngredientsPhoto(file) {
    if (!enabled) throw error('ingredient_photo_disabled', 'ingredient_photo_disabled');
    if (providerUnavailable) throw error('vision_not_configured', 'vision_not_configured', 503);

    const [session, imageDataUrl] = await Promise.all([
      auth.ensureSession(),
      compressImage(file),
    ]);
    if (!session?.access_token) throw error('no_supabase_session', 'no_supabase_session', 401);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        mode: 'cook_ingredients_photo',
        imageDataUrl,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data?.error === 'vision_not_configured') providerUnavailable = true;
      throw error(
        data?.message || data?.error || `ingredient_photo_${response.status}`,
        data?.error || data?.code || null,
        response.status,
      );
    }
    if (!data?.ingredientPhoto || !Array.isArray(data.ingredientPhoto.ingredients)) {
      throw error('empty_ingredient_photo_analysis', 'empty_ingredient_photo_analysis', 502);
    }
    return data;
  }

  async function analyzeFile(file, context = {}) {
    if (!enabled) throw error('vision_disabled', 'vision_disabled');
    if (providerUnavailable) throw error('vision_not_configured', 'vision_not_configured', 503);

    const [session, imageDataUrl] = await Promise.all([
      auth.ensureSession(),
      compressImage(file),
    ]);
    if (!session?.access_token) throw error('no_supabase_session', 'no_supabase_session', 401);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        imageDataUrl,
        goal: context.goal || 'weight_loss',
        decisionStage: ['choosing','preparing','ready'].includes(context.decisionStage)
          ? context.decisionStage
          : 'ready',
        dailyTarget: Number(context.dailyTarget || 0),
        dayCaloriesMin: Number(context.dayCaloriesMin || 0),
        dayCaloriesMax: Number(context.dayCaloriesMax || 0),
        profile: context.profile || {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data?.error === 'vision_not_configured') providerUnavailable = true;
      throw error(
        data?.message || data?.error || `vision_${response.status}`,
        data?.error || data?.code || null,
        response.status,
      );
    }
    if (!data?.analysis) throw error('empty_vision_analysis', 'empty_vision_analysis', 502);
    return data;
  }


  async function analyzeText(question, context = {}) {
    if (!enabled) throw error('decision_ai_disabled', 'decision_ai_disabled');
    if (providerUnavailable) throw error('decision_ai_not_configured', 'decision_ai_not_configured', 503);

    const text = String(question || '').trim();
    if (text.length < 3) throw error('question_too_short', 'question_too_short', 400);

    const session = await auth.ensureSession();
    if (!session?.access_token) throw error('no_supabase_session', 'no_supabase_session', 401);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        question: text,
        goal: context.goal || 'weight_loss',
        decisionStage: ['choosing','preparing','ready'].includes(context.decisionStage)
          ? context.decisionStage
          : 'choosing',
        dailyTarget: Number(context.dailyTarget || 0),
        dayCaloriesMin: Number(context.dayCaloriesMin || 0),
        dayCaloriesMax: Number(context.dayCaloriesMax || 0),
        profile: context.profile || {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data?.error === 'vision_not_configured') providerUnavailable = true;
      throw error(
        data?.message || data?.error || `decision_${response.status}`,
        data?.error || data?.code || null,
        response.status,
      );
    }
    if (!data?.analysis) throw error('empty_decision_analysis', 'empty_decision_analysis', 502);
    return data;
  }


  async function refineAnalysis(priorAnalysis, context = {}) {
    if (!enabled) throw error('decision_ai_disabled', 'decision_ai_disabled');
    if (providerUnavailable) throw error('decision_ai_not_configured', 'decision_ai_not_configured', 503);
    if (!priorAnalysis || typeof priorAnalysis !== 'object') {
      throw error('prior_analysis_required', 'prior_analysis_required', 400);
    }

    const recentCorrections = Array.isArray(context.profile?.recentCorrections)
      ? context.profile.recentCorrections
      : [];
    if (!recentCorrections.length) return { analysis: priorAnalysis, meta: { memoryRefined: false } };

    const session = await auth.ensureSession();
    if (!session?.access_token) throw error('no_supabase_session', 'no_supabase_session', 401);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        question: String(context.query || priorAnalysis.request_summary || priorAnalysis.dish_name || '').trim(),
        priorAnalysis,
        memoryRefinement: true,
        goal: context.goal || 'weight_loss',
        decisionStage: ['choosing','preparing','ready'].includes(context.decisionStage)
          ? context.decisionStage
          : (priorAnalysis.decision_stage || 'choosing'),
        dailyTarget: Number(context.dailyTarget || 0),
        dayCaloriesMin: Number(context.dayCaloriesMin || 0),
        dayCaloriesMax: Number(context.dayCaloriesMax || 0),
        profile: context.profile || {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw error(
        data?.message || data?.error || `memory_refine_${response.status}`,
        data?.error || data?.code || null,
        response.status,
      );
    }
    if (!data?.analysis) throw error('empty_memory_refinement', 'empty_memory_refinement', 502);
    return data;
  }


  async function analyzeAudio(audioBlob, context = {}) {
    if (!enabled) throw error('decision_ai_disabled', 'decision_ai_disabled');
    if (providerUnavailable) throw error('decision_ai_not_configured', 'decision_ai_not_configured', 503);
    if (!audioBlob || !String(audioBlob.type || '').startsWith('audio/')) {
      throw error('invalid_audio', 'invalid_audio', 400);
    }

    const [session, audioDataUrl] = await Promise.all([
      auth.ensureSession(),
      readAsDataUrl(audioBlob),
    ]);
    if (!session?.access_token) throw error('no_supabase_session', 'no_supabase_session', 401);

    const response = await fetch(`${base}/functions/v1/analyze-food`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        audioDataUrl,
        question: String(context.clarification || '').trim(),
        goal: context.goal || 'weight_loss',
        decisionStage: ['choosing','preparing','ready','auto'].includes(context.decisionStage)
          ? context.decisionStage
          : 'auto',
        dailyTarget: Number(context.dailyTarget || 0),
        dayCaloriesMin: Number(context.dayCaloriesMin || 0),
        dayCaloriesMax: Number(context.dayCaloriesMax || 0),
        profile: context.profile || {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data?.error === 'vision_not_configured') providerUnavailable = true;
      throw error(
        data?.message || data?.error || `audio_decision_${response.status}`,
        data?.error || data?.code || null,
        response.status,
      );
    }
    if (!data?.analysis) throw error('empty_audio_analysis', 'empty_audio_analysis', 502);
    return data;
  }

  window.RinloVision = {
    version: 'v1.6-cook-ingredients',
    enabled,
    localOnly,
    analyzeFile,
    analyzeIngredientsPhoto,
    analyzeText,
    analyzeAudio,
    refineAnalysis,
    compressImage,
    isProviderAvailable: () => !providerUnavailable,
  };
})();