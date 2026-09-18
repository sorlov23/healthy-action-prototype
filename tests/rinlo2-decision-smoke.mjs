import { chromium } from 'playwright';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  if (/^Failed to load resource:/i.test(msg.text())) return;
  errors.push(msg.text());
});

try {
  await page.goto('http://127.0.0.1:4173/rinlo2/index.html?reset=1&local=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Посмотреть демо без настройки', exact: true }).click();
  await page.getByRole('heading', { name: 'Что собираешься съесть?', exact: false }).waitFor({ state: 'visible' });

  const homeGeometry = await page.locator('body').evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const buttons = [...document.querySelectorAll('.hero-actions .btn')].map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    });
    return {
      viewportWidth: root.clientWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      buttons,
    };
  });
  assert(homeGeometry.documentWidth <= homeGeometry.viewportWidth + 1, `home_horizontal_overflow:${JSON.stringify(homeGeometry)}`);
  assert(homeGeometry.buttons.length === 2, `home_cta_count:${JSON.stringify(homeGeometry)}`);
  assert(homeGeometry.buttons.every((button) => button.height >= 54 && button.left >= 0 && button.right <= 390), `home_cta_geometry:${JSON.stringify(homeGeometry)}`);
  assert(homeGeometry.buttons[0].bottom < homeGeometry.buttons[1].top, `home_ctas_not_stacked:${JSON.stringify(homeGeometry)}`);

  await page.locator('[data-action="voice"]').click();
  const voiceStep = page.locator('[data-flow-step="voice"]');
  await voiceStep.waitFor({ state: 'visible' });
  await voiceStep.getByRole('heading', { name: 'Что собираешься съесть?', exact: true }).waitFor({ state: 'visible' });
  assert(await page.locator('#voiceRecordButton').isVisible(), 'voice_record_button_missing');
  assert((await page.locator('#voiceStateTitle').textContent())?.length > 0, 'voice_state_missing');
  await page.locator('[data-flow-step="voice"] [data-flow-back]').click();

  await page.locator('[data-action="photo"]').click();
  await page.locator('#photoInput').setInputFiles({
    name: 'meal.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2VZsAAAAASUVORK5CYII=', 'base64'),
  });
  await page.getByRole('heading', { name: 'Что на фото?', exact: true }).waitFor({ state: 'visible' });
  await page.locator('#photoVisionStatus[data-state="fallback"]').waitFor({ state: 'visible' });
  const visionState = await page.evaluate(() => ({
    enabled: window.RinloVision?.enabled,
    localOnly: window.RinloVision?.localOnly,
    status: document.getElementById('photoVisionStatus')?.dataset.state,
    text: document.getElementById('photoVisionStatus')?.textContent || '',
  }));
  assert(visionState.enabled === false && visionState.localOnly === true, `vision_not_local_only:${JSON.stringify(visionState)}`);
  assert(visionState.status === 'fallback' && visionState.text.includes('уточнение'), `vision_fallback_missing:${JSON.stringify(visionState)}`);
  await page.locator('#photoDescription').fill('Овсянка с ягодами');
  await page.getByRole('button', { name: 'Разобрать выбор', exact: false }).click();
  await page.getByRole('heading', { name: 'Можно брать', exact: true }).waitFor({ state: 'visible' });
  assert((await page.locator('#resultCalories').textContent())?.includes('320'), 'photo_flow_result_missing');
  assert(await page.locator('#showAlternative').isHidden(), 'ready_photo_should_not_offer_alternative');
  await page.locator('[data-flow-step="result"] [data-flow-back]').click();
  await page.getByRole('heading', { name: 'Что на фото?', exact: true }).waitFor({ state: 'visible' });
  await page.locator('[data-flow-step="photo"] [data-flow-back]').click();

  await page.locator('[data-action="text"]').click();
  await page.getByRole('heading', { name: 'Что хочешь съесть?', exact: true }).waitFor({ state: 'visible' });
  await page.locator('#decisionQuestion').fill('Я уже приготовил бургер и колу');
  await page.getByRole('button', { name: 'Получить ответ', exact: false }).click();
  await page.getByRole('heading', { name: 'Можно, но лучше аккуратнее', exact: true }).waitFor({ state: 'visible' });
  assert(await page.locator('#showAlternative').isHidden(), 'ready_text_should_not_offer_alternative');
  await page.locator('[data-flow-step="result"] [data-flow-back]').click();
  await page.locator('#decisionQuestion').fill('Можно сегодня бургер и колу?');
  await page.getByRole('button', { name: 'Получить ответ', exact: false }).click();

  await page.getByRole('heading', { name: 'Можно, но лучше аккуратнее', exact: true }).waitFor({ state: 'visible' });
  assert((await page.locator('#resultCalories').textContent())?.includes('820'), 'result_calories_missing');
  assert((await page.locator('#prospectiveCalorieValue').textContent())?.includes('820'), 'prospective_original_calories_missing');

  await page.locator('#resultFeedbackCard').getByRole('button', { name: 'Полезно', exact: true }).click();
  assert((await page.locator('#resultFeedbackCard [data-feedback-status]').textContent())?.includes('полезное'), 'result_feedback_helpful_missing');
  const feedbackAfterHelpful = await page.evaluate(() => window.Rinlo2Feedback?.getRecentStats?.(30));
  assert(feedbackAfterHelpful?.total === 1 && feedbackAfterHelpful?.helpful === 1, `feedback_helpful_stats_wrong:${JSON.stringify(feedbackAfterHelpful)}`);

  await page.getByRole('button', { name: 'Показать вариант лучше', exact: true }).click();
  await page.getByRole('heading', { name: 'Есть вариант лучше', exact: true }).waitFor({ state: 'visible' });
  assert((await page.locator('#alternativeCalories').textContent())?.includes('540'), 'alternative_calories_missing');
  assert((await page.locator('#alternativeProspectiveValue').textContent())?.includes('540'), 'prospective_alternative_calories_missing');

  await page.getByRole('button', { name: 'Выбрать этот вариант', exact: true }).click();
  await page.getByRole('heading', { name: 'Запомнил.', exact: true }).waitFor({ state: 'visible' });
  assert((await page.locator('#savedCalories').textContent())?.includes('540'), 'saved_calories_missing');
  const savedThumb = await page.locator('#savedThumb').evaluate((el) => ({
    source: el.dataset.source,
    backgroundImage: getComputedStyle(el).backgroundImage,
    hasPhoto: el.classList.contains('has-photo'),
  }));
  assert(savedThumb.source === 'text', `saved_thumb_wrong_source:${JSON.stringify(savedThumb)}`);
  assert(savedThumb.hasPhoto === false && !savedThumb.backgroundImage.includes('url('), `text_saved_thumb_should_not_fake_food:${JSON.stringify(savedThumb)}`);

  await page.getByRole('button', { name: 'Открыть историю', exact: true }).click();
  await page.getByRole('heading', { name: 'История решений', exact: true }).waitFor({ state: 'visible' });
  const historyRow = page.locator('#historyList').getByRole('button').filter({ hasText: 'Бургер без соуса + Cola Zero' });
  await historyRow.waitFor({ state: 'visible' });
  assert((await page.locator('#historyCount').textContent())?.includes('1'), 'history_count_wrong');
  const historyThumb = await historyRow.locator('.decision-source-thumb').evaluate((el) => ({
    source: el.dataset.source,
    backgroundImage: getComputedStyle(el).backgroundImage,
  }));
  assert(historyThumb.source === 'text' && !historyThumb.backgroundImage.includes('url('), `history_thumb_should_reflect_source:${JSON.stringify(historyThumb)}`);

  await historyRow.click();
  await page.locator('[data-flow-step="detail"]').waitFor({ state: 'visible' });
  assert((await page.locator('#detailName').textContent())?.includes('Бургер без соуса + Cola Zero'), 'detail_selected_name_missing');
  assert((await page.locator('#detailTitle').textContent())?.includes('Можно, но лучше аккуратнее'), 'detail_verdict_missing');
  assert((await page.locator('#detailStageNote').textContent())?.includes('до еды'), 'detail_stage_context_missing');
  assert((await page.locator('#detailFeedbackCard [data-feedback-status]').textContent())?.includes('полезное'), 'detail_feedback_not_persisted');
  await page.locator('#detailFeedbackCard').getByRole('button', { name: 'Не помогло', exact: true }).click();
  assert((await page.locator('#detailFeedbackCard [data-feedback-status]').textContent())?.includes('не помогло'), 'detail_feedback_change_missing');
  const feedbackAfterChange = await page.evaluate(() => window.Rinlo2Feedback?.getRecentStats?.(30));
  assert(feedbackAfterChange?.total === 1 && feedbackAfterChange?.notHelpful === 1 && feedbackAfterChange?.helpful === 0, `feedback_change_stats_wrong:${JSON.stringify(feedbackAfterChange)}`);

  await page.getByRole('button', { name: 'Исправить данные решения', exact: true }).click();
  await page.getByRole('button', { name: 'Неточный состав', exact: true }).click();
  await page.locator('#correctionInput').fill('без соуса');
  await page.getByRole('button', { name: 'Сохранить поправку', exact: true }).click();
  await page.locator('#detailCorrectionHistory').waitFor({ state: 'visible' });
  assert((await page.locator('#detailCorrectionHistory').textContent())?.includes('без соуса'), 'detail_correction_missing');

  const memoryMatchBeforeRevoke = await page.evaluate(() => ({
    burger: window.Rinlo2Corrections?.getRelevantContext?.('Бургер без соуса', 30, 4) || [],
    oatmeal: window.Rinlo2Corrections?.getRelevantContext?.('Овсянка с ягодами', 30, 4) || [],
  }));
  assert(memoryMatchBeforeRevoke.burger.length === 1, `burger_memory_should_match:${JSON.stringify(memoryMatchBeforeRevoke)}`);
  assert(memoryMatchBeforeRevoke.oatmeal.length === 0, `oatmeal_memory_should_not_match:${JSON.stringify(memoryMatchBeforeRevoke)}`);

  await page.evaluate((sources) => window.Rinlo2Decisions?.showMemoryExplanation?.(sources), memoryMatchBeforeRevoke.burger);
  await page.locator('#memoryExplainSheet').waitFor({ state: 'visible' });
  const explainText = await page.locator('#memoryExplainSheet').textContent();
  assert(explainText?.includes('Что повлияло на ответ'), 'memory_explain_title_missing');
  assert(explainText?.includes('без соуса'), 'memory_explain_value_missing');
  assert(explainText?.includes('уточнял состав похожего блюда'), 'memory_explain_reason_missing');
  assert(explainText?.toLowerCase().includes('текущий запрос всегда важнее памяти'), 'memory_explain_priority_missing');
  await page.getByRole('button', { name: 'Понятно', exact: true }).click();
  await page.locator('#memoryExplainSheet').waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: 'Готово', exact: true }).click();

  await page.locator('[data-nav="progress"]').last().click();
  await page.getByRole('heading', { name: 'Что меняется', exact: true }).waitFor({ state: 'visible' });
  assert((await page.locator('#progressDecisionCount').textContent())?.includes('1 решение'), 'progress_decision_count_wrong');
  assert((await page.locator('#progressChosenAdjustmentCount').textContent())?.trim() === '1', 'progress_adjustment_count_wrong');
  assert((await page.locator('#progressFeedbackTitle').textContent())?.includes('0 из 1'), 'progress_feedback_quality_wrong');
  assert((await page.locator('#progressFeedbackText').textContent())?.includes('1 ответ не помог'), 'progress_feedback_negative_signal_missing');

  await page.locator('[data-nav="home"]').last().click();
  await page.locator('#dayCalorieContext').waitFor({ state: 'visible' });
  assert((await page.locator('#dayCalorieValue').textContent())?.includes('540'), 'day_context_not_updated');

  const api = await page.locator('body').evaluate(() => window.Rinlo2Decisions?.getDayContext?.());
  assert(api?.target === null, `day_target_should_be_unset:${JSON.stringify(api)}`);
  assert(api?.decisions === 1, `day_decision_count_wrong:${JSON.stringify(api)}`);
  assert(api?.calories?.min === 540 && api?.calories?.max === 540, `day_calories_wrong:${JSON.stringify(api)}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#dayCalorieContext').waitFor({ state: 'visible' });
  assert((await page.locator('#dayCalorieValue').textContent())?.includes('540'), 'day_context_not_persisted_after_reload');

  await page.locator('[data-nav="profile"]').last().click();
  await page.getByRole('heading', { name: 'Профиль', exact: true }).waitFor({ state: 'visible' });

  await page.locator('#rinloMemoryCard').waitFor({ state: 'visible' });
  assert((await page.locator('#rinloMemoryCard').textContent())?.includes('без соуса'), 'profile_memory_missing');
  await page.getByRole('button', { name: /Не учитывать поправку:/ }).click();
  await page.locator('#rinloMemoryEmpty').waitFor({ state: 'visible' });
  const memoryAfterRevoke = await page.evaluate(() =>
    window.Rinlo2Corrections?.getRelevantContext?.('Бургер без соуса', 30, 4) || []
  );
  assert(memoryAfterRevoke.length === 0, `revoked_memory_should_not_match:${JSON.stringify(memoryAfterRevoke)}`);
  await page.locator('[data-profile-goal="aware"]').click();
  await page.locator('#profileCurrentWeight').fill('80');
  await page.locator('#profileTargetWeight').fill('72');
  await page.locator('[data-profile-priority="satiety"]').click();
  await page.locator('[data-profile-priority="simplicity"]').click();
  await page.getByRole('button', { name: 'Сохранить контекст', exact: true }).click();

  const profileApi = await page.evaluate(() => window.Rinlo2Foundation?.getDecisionProfile?.());
  assert(profileApi?.goal === 'aware', `profile_goal_wrong:${JSON.stringify(profileApi)}`);
  assert(profileApi?.currentWeight === 80 && profileApi?.targetWeight === 72, `profile_weight_wrong:${JSON.stringify(profileApi)}`);
  assert(Array.isArray(profileApi?.priorities) && profileApi.priorities.includes('satiety') && profileApi.priorities.includes('simplicity'), `profile_priorities_wrong:${JSON.stringify(profileApi)}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloadedProfile = await page.evaluate(() => window.Rinlo2Foundation?.getDecisionProfile?.());
  assert(reloadedProfile?.goal === 'aware' && reloadedProfile?.currentWeight === 80 && reloadedProfile?.targetWeight === 72, `profile_persistence_failed:${JSON.stringify(reloadedProfile)}`);

  if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
  console.log(`RINLO2_DECISION_CONTEXT=${JSON.stringify({ homeGeometry, visionState, api })}`);
  console.log('RINLO2_DECISION_RESULT=PASS');
} finally {
  await browser.close();
}
