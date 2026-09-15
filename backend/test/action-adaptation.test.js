import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAdaptiveCandidate } from '../src/action-adaptation.js';

const candidates = [
  {
    kind: 'movement',
    title: 'Пройдитесь 10 минут',
    rationale: 'Небольшой прогулки достаточно.',
    effortMinutes: 10,
    context: { signal: 'steps_low' },
  },
  {
    kind: 'hydration',
    title: 'Выпейте стакан воды',
    rationale: 'Один стакан — достаточный следующий шаг.',
    effortMinutes: 2,
    context: { signal: 'water_low' },
  },
];

test('avoids a previously not-useful action kind when an alternative exists', () => {
  const result = selectAdaptiveCandidate(candidates, {
    previousReview: {
      day: '2026-09-11',
      planFit: 'right',
      actionUseful: 'no',
      mainActionKind: 'movement',
    },
  });

  assert.equal(result.kind, 'hydration');
  assert.equal(result.context.adaptation.avoidedPreviousKind, true);
});

test('prefers a previously useful action kind when it still fits today', () => {
  const result = selectAdaptiveCandidate([...candidates].reverse(), {
    previousReview: {
      day: '2026-09-11',
      planFit: 'right',
      actionUseful: 'yes',
      mainActionKind: 'movement',
    },
  });

  assert.equal(result.kind, 'movement');
  assert.equal(result.context.adaptation.repeatedHelpfulKind, true);
});

test('reduces effort after a too-much review without escalating easy days', () => {
  const reduced = selectAdaptiveCandidate(candidates, {
    previousReview: {
      day: '2026-09-11',
      planFit: 'too_much',
      actionUseful: 'yes',
      mainActionKind: 'movement',
    },
  });

  assert.equal(reduced.kind, 'movement');
  assert.equal(reduced.effortMinutes, 5);
  assert.equal(reduced.title, 'Пройдитесь 5 минут');
  assert.match(reduced.rationale, /шаг короче/);
  assert.equal(reduced.context.adaptation.effortReduced, true);
  assert.equal(reduced.context.adaptation.repeatedHelpfulKind, true);

  const steady = selectAdaptiveCandidate(candidates, {
    previousReview: {
      day: '2026-09-11',
      planFit: 'easy',
      actionUseful: 'yes',
      mainActionKind: 'movement',
    },
  });

  assert.equal(steady.effortMinutes, 10);
  assert.equal(steady.context.adaptation.effortReduced, false);
});

test('makes the next step shorter after the previous step was skipped', () => {
  const result = selectAdaptiveCandidate(candidates, {
    previousReview: {
      day: '2026-09-11',
      planFit: 'right',
      actionUseful: 'skipped',
      mainActionKind: 'movement',
    },
  });

  assert.equal(result.kind, 'movement');
  assert.equal(result.effortMinutes, 5);
  assert.equal(result.title, 'Пройдитесь 5 минут');
  assert.match(result.rationale, /не состоялся/);
  assert.equal(result.context.adaptation.effortReduced, true);
  assert.equal(result.context.adaptation.easedAfterSkip, true);
});

test('today rejection has priority and fallback always returns a candidate', () => {
  const result = selectAdaptiveCandidate(candidates, {
    currentRejectedKind: 'movement',
    previousReview: {
      day: '2026-09-11',
      planFit: 'right',
      actionUseful: 'no',
      mainActionKind: 'hydration',
    },
  });

  assert.equal(result.kind, 'hydration');
});
