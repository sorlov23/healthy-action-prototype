(() => {
  'use strict';

  // Only the exercise illustration crops are bundled, with the original poses.
  // Source rectangles and the reproducible asset build live in scripts/.
  const BASE = './assets/technique-cards/';
  const sheets = Object.freeze({poses: 'poses.webp'});
  const ATLAS = {width: 1500, height: 3000};
  const frame = (rect, label, alt) => ({sheet: 'poses', rect, label, alt, covers: []});
  const scenes = {
    'chair-goblet-squat': {
      hint: 'Гантель у груди. Таз назад к стулу, колени по линии носков.',
      frames: [
        frame([0, 0, 300, 300], '1 · Старт', 'Мужчина стоит перед стулом с гантелью у груди.'),
        frame([300, 0, 300, 300], '2 · Присед', 'Мужчина приседает к стулу, удерживая гантель у груди.')
      ]
    },
    'floor-dumbbell-press': {
      hint: 'Локти примерно под 45°. Плавно выжми гантели и опусти под контролем.',
      frames: [
        frame([600, 0, 300, 300], '1 · Внизу', 'Мужчина лежит на полу, колени согнуты, гантели у груди.'),
        frame([900, 0, 300, 300], '2 · Жим вверх', 'Мужчина выжимает гантели вверх, лёжа на полу.')
      ]
    },
    'one-arm-row-chair': {
      hint: 'Опирайся рукой на устойчивый стул. Тяни локоть к тазу, не разворачивая корпус.',
      frames: [
        frame([1200, 0, 300, 300], '1 · Рука внизу', 'Мужчина наклонён с опорой рукой на стул, гантель в опущенной руке.'),
        frame([0, 300, 300, 300], '2 · Локоть назад', 'Мужчина тянет гантель к поясу, сохраняя опору рукой на стул.')
      ]
    },
    'glute-bridge': {
      hint: 'Стопы на полу. Подними таз, сожми ягодицы и плавно опустись.',
      frames: [
        frame([300, 300, 300, 300], '1 · Таз на полу', 'Мужчина лежит на спине с согнутыми коленями и стопами на полу.'),
        frame([600, 300, 300, 300], '2 · Подъём таза', 'Мужчина поднимает таз в ягодичный мост, плечи и стопы на полу.')
      ]
    },
    'weighted-glute-bridge': {
      hint: 'Удерживай гантель руками на тазу. Вверху сделай паузу 1 секунду.',
      frames: [
        frame([900, 300, 300, 300], '1 · Таз на полу', 'Мужчина лежит на спине, удерживая гантель на тазу.'),
        frame([1200, 300, 300, 300], '2 · Мост с гантелью', 'Мужчина поднимает таз с гантелью, стопы и плечи остаются на полу.')
      ]
    },
    'bird-dog': {
      hint: 'Вытяни противоположные руку и ногу. Таз ровный, поясница нейтральная.',
      frames: [
        frame([0, 600, 300, 300], '1 · На четвереньках', 'Мужчина стоит на четвереньках, ладони под плечами, колени под тазом.'),
        frame([300, 600, 300, 300], '2 · Рука и нога', 'Мужчина вытягивает вперёд руку и назад противоположную ногу.')
      ]
    },
    'side-plank-knee': {
      hint: 'Локоть под плечом. Подними таз с опорой на предплечье и согнутые колени.',
      frames: [
        frame([600, 600, 300, 300], '1 · Опора на колени', 'Мужчина лежит на боку с опорой на предплечье, колени согнуты.'),
        frame([900, 600, 300, 300], '2 · Удерживай таз', 'Мужчина удерживает боковую планку с колен, приподняв таз.')
      ]
    },
    'split-squat-chair': {
      hint: 'Задняя стопа на стуле. Опускайся вниз, сохраняя переднюю стопу на полу.',
      frames: [
        frame([1200, 600, 300, 300], '1 · Старт', 'Мужчина стоит спиной к стулу, задняя стопа на сиденье.'),
        frame([0, 900, 300, 300], '2 · Опустись вниз', 'Мужчина выполняет сплит-присед, задняя стопа остаётся на стуле.')
      ]
    },
    'incline-pushup-chair': {
      hint: 'Устойчивая высокая опора. Корпус одной линией, грудь движется к опоре.',
      frames: [
        frame([300, 900, 300, 300], '1 · Руки прямые', 'Мужчина опирается руками на сиденье стула в наклонной планке.'),
        frame([600, 900, 300, 300], '2 · Согни локти', 'Мужчина опускает грудь к сиденью стула, сгибая локти.')
      ]
    },
    'dead-bug': {
      hint: 'Медленно выпрямляй противоположные руку и ногу. Поясница остаётся прижатой.',
      frames: [
        frame([900, 900, 300, 300], '1 · Руки и ноги вверх', 'Мужчина лежит на спине, руки подняты, бёдра вертикальны, колени согнуты.'),
        frame([1200, 900, 300, 300], '2 · Выпрями пару', 'Мужчина вытягивает противоположные руку и ногу над полом.')
      ]
    },
    'calf-raise': {
      hint: 'Держись за стул. Поднимись на носки и плавно опусти пятки.',
      frames: [
        frame([0, 1200, 300, 300], '1 · Пятки на полу', 'Мужчина стоит с опорой руками на спинку стула, пятки на полу.'),
        frame([300, 1200, 300, 300], '2 · На носки', 'Мужчина поднимается на носки, придерживаясь за стул.')
      ]
    },
    'romanian-deadlift': {
      hint: 'Таз назад, гантели вдоль ног. Спина нейтральная, амплитуда комфортная.',
      frames: [
        frame([600, 1200, 300, 300], '1 · Стой прямо', 'Мужчина стоит с гантелями в опущенных руках перед бёдрами.'),
        frame([900, 1200, 300, 300], '2 · Таз назад', 'Мужчина наклоняется за счёт движения таза назад, гантели вдоль ног.')
      ]
    },
    'reverse-lunge-glute': {
      hint: 'Сделай шаг назад под контролем. Возвращайся через опорную ногу.',
      frames: [
        frame([1200, 1200, 300, 300], '1 · Стой прямо', 'Мужчина стоит с гантелями по бокам.'),
        frame([0, 1500, 300, 300], '2 · Шаг назад', 'Мужчина делает обратный выпад, опуская колено задней ноги.')
      ]
    },
    'frog-pump': {
      hint: 'Соедини подошвы и раскрой колени в стороны. Из этого положения поднимай таз.',
      frames: [
        frame([300, 1500, 300, 300], '1 · Подошвы вместе', 'Вид со стороны стоп: мужчина лежит на спине, подошвы соединены, колени широко разведены.'),
        frame([600, 1500, 300, 300], '2 · Подними таз', 'Мужчина поднимает таз, сохраняя подошвы вместе и колени разведёнными.')
      ]
    },
    'fire-hydrant': {
      hint: 'Колено согнуто под 90°. Отведи его в сторону, не разворачивая таз.',
      frames: [
        frame([900, 1500, 300, 300], '1 · На четвереньках', 'Мужчина стоит на четвереньках, обе руки и колени на полу.'),
        frame([1200, 1500, 300, 300], '2 · Колено в сторону', 'Мужчина отводит согнутое колено в сторону, сохраняя таз ровным.')
      ]
    },
    'side-abduction': {
      hint: 'Ляг на бок. Поднимай верхнюю ногу без разворота таза, носок слегка вниз.',
      frames: [
        frame([0, 1800, 300, 300], '1 · Ноги вместе', 'Мужчина лежит на боку, ноги лежат одна на другой.'),
        frame([300, 1800, 300, 300], '2 · Подними ногу', 'Мужчина поднимает верхнюю ногу лёжа на боку, корпус остаётся стабильным.')
      ]
    },
    'shoulder-circles': {
      hint: 'Делай мягкие круги плечами назад, затем вперёд.',
      frames: [frame([600, 1800, 300, 300], 'Круги плечами', 'Мужчина выполняет круги плечами; стрелки показывают направление движения.')]
    },
    'hip-circles': {
      hint: 'Руки на поясе. Небольшие контролируемые круги тазом.',
      frames: [frame([900, 1800, 300, 300], 'Круги тазом', 'Мужчина держит руки на поясе; круговая стрелка показывает движение таза.')]
    },
    'cat-cow': {
      hint: 'На четвереньках плавно меняй положение спины, без резких движений.',
      frames: [
        frame([1200, 1800, 300, 300], '1 · Мягкий прогиб', 'Мужчина стоит на четвереньках с мягким прогибом спины.'),
        frame([0, 2100, 300, 300], '2 · Округли спину', 'Мужчина плавно округляет спину, оставаясь на четвереньках.')
      ]
    },
    'chair-squat-warmup': {
      hint: 'Без веса. Таз назад к стулу, колени по линии носков.',
      frames: [frame([300, 2100, 300, 300], 'Присед к стулу', 'Мужчина приседает к стулу без веса, вытянув руки перед собой.')]
    },
    'warmup-bike': {
      hint: 'Спокойный разговорный темп. Держи плечи расслабленными.',
      frames: [frame([600, 2100, 300, 300], 'Лёгкое вело', 'Мужчина спокойно крутит педали велотренажёра.')]
    },
    'cardio-bike': {
      hint: 'Комфортный разговорный темп, без спринтов.',
      frames: [frame([900, 2100, 300, 300], 'Велотренажёр', 'Мужчина тренируется на велотренажёре, руки спокойно лежат на руле.')]
    },
    'recovery-bike-walk': {
      hint: 'Очень лёгкое вело или спокойная прогулка — по самочувствию.',
      frames: [
        frame([1200, 2100, 300, 300], 'Вариант · вело', 'Мужчина спокойно крутит педали велотренажёра.'),
        frame([0, 2400, 300, 300], 'Вариант · прогулка', 'Мужчина идёт спокойным шагом по дорожке.')
      ]
    },
    'easy-bike-walk': {
      hint: 'Постепенно снижай темп. Выбери лёгкое вело или ходьбу.',
      frames: [
        frame([300, 2400, 300, 300], 'Вариант · вело', 'Мужчина крутит педали велотренажёра в лёгком темпе.'),
        frame([600, 2400, 300, 300], 'Вариант · ходьба', 'Мужчина спокойно идёт по дорожке.')
      ]
    },
    'breathing': {
      hint: 'Сядь удобно. Дыши спокойно, без задержек.',
      frames: [frame([900, 2400, 300, 300], 'Спокойное дыхание', 'Мужчина сидит на коврике со скрещёнными ногами и расслабленными плечами.')]
    },
    'stretch-glute': {
      hint: 'Мягко подтяни согнутую ногу к себе. Без боли и пружинящих движений.',
      frames: [frame([1200, 2400, 300, 300], 'Удерживай положение', 'Мужчина сидя мягко подтягивает согнутую ногу к груди для растяжки ягодиц.')]
    },
    'stretch-hip-flexor': {
      hint: 'Одно колено на коврике, другая стопа впереди. Таз слегка подкручен.',
      frames: [frame([0, 2700, 300, 300], 'Удерживай положение', 'Мужчина выполняет растяжку сгибателей бедра в выпаде с коленом на коврике.')]
    },
    'chest-wall-stretch': {
      hint: 'Ладонь на стене. Мягко разверни корпус, не выходя в боль.',
      frames: [frame([300, 2700, 300, 300], 'Ладонь на стене', 'Мужчина опирается ладонью на стену и мягко разворачивает грудную клетку.')]
    },
    'stretch-thoracic': {
      hint: 'Мягко открывай грудной отдел. Двигайся плавно и без боли.',
      frames: [frame([608, 2770, 284, 160], 'Открытие грудного отдела', 'Мужчина с опорой на руку и согнутые колени раскрывает грудную клетку, поднимая другую руку.')]
    }
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let dialog;
  let originButton;
  let artIndex = 0;

  function art(item) {
    const [x, y, width, height] = item.rect;
    const clipId = `fit74-pose-${++artIndex}`;
    const covers = item.covers.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="#fff"/>`).join('');
    return `<figure class="technique-pose"><div class="technique-art"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${esc(item.alt)}"><defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#${clipId})"><image href="${BASE + sheets[item.sheet]}" width="${ATLAS.width}" height="${ATLAS.height}"/>${covers}</g></svg></div><figcaption>${esc(item.label)}</figcaption></figure>`;
  }

  function frames(scene) {
    return `<div class="technique-poses ${scene.frames.length === 1 ? 'technique-poses-single' : ''}">${scene.frames.map(art).join('')}</div>`;
  }

  function html(slug, title = 'Техника упражнения') {
    const scene = scenes[slug];
    if (!scene) return '';
    return `<section class="technique-images" data-technique-scene="${slug}" aria-label="Техника: ${esc(title)}"><div class="technique-images-head"><span>Техника выполнения</span><button type="button" data-technique-zoom="${slug}" data-technique-title="${esc(title)}" aria-label="Увеличить технику: ${esc(title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg><span>Крупнее</span></button></div>${frames(scene)}<p class="technique-image-hint">${esc(scene.hint)}</p></section>`;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'technique-image-dialog';
    dialog.setAttribute('aria-labelledby', 'techniqueImageTitle');
    dialog.innerHTML = '<div class="technique-dialog-shell"><header class="technique-dialog-head"><div><p>Техника выполнения</p><h2 id="techniqueImageTitle"></h2></div><button type="button" data-technique-close aria-label="Закрыть изображение">×</button></header><div class="technique-dialog-body"></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-technique-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('technique-image-lock');
      if (originButton?.isConnected) originButton.focus({preventScroll: true});
    });
    return dialog;
  }

  function open(slug, title, button) {
    const scene = scenes[slug];
    if (!scene) return;
    const modal = ensureDialog();
    originButton = button;
    modal.querySelector('#techniqueImageTitle').textContent = title || 'Техника упражнения';
    const body = modal.querySelector('.technique-dialog-body');
    body.innerHTML = frames(scene) + `<p class="technique-image-hint">${esc(scene.hint)}</p>`;
    if (!modal.open) modal.showModal();
    body.scrollTop = 0;
    document.body.classList.add('technique-image-lock');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-technique-zoom]');
    if (button) open(button.dataset.techniqueZoom, button.dataset.techniqueTitle, button);
  });

  function render() {
    const button = document.getElementById('v7ResetWorkout');
    if (button) {
      button.textContent = '↺ Сбросить прогресс';
      button.classList.add('technique-reset-action');
      button.title = 'Сбросить прогресс текущей тренировки';
    }
  }

  const api = {version: '10.0', html, render, open, scenes, sheets};
  window.Fit74TechniqueImages = api;
  // Keep the established player interface; no progress or account storage changes.
  window.Fit74V7Sprite = api;
})();
