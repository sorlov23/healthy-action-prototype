function reducedEffortMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 5) return Number.isFinite(minutes) ? minutes : value;
  return Math.max(5, Math.round((minutes * 0.5) / 5) * 5);
}

function shortenTitle(title, beforeMinutes, afterMinutes) {
  if (!Number.isFinite(beforeMinutes) || beforeMinutes === afterMinutes) return title;
  const pattern = new RegExp(`\\b${beforeMinutes}\\b`);
  return pattern.test(String(title || ''))
    ? String(title).replace(pattern, String(afterMinutes))
    : title;
}

export function selectAdaptiveCandidate(candidates, {
  currentRejectedKind = null,
  previousReview = null,
} = {}) {
  if (!Array.isArray(candidates) || !candidates.length) return null;

  const previousKind = previousReview?.mainActionKind || null;
  const avoidPreviousKind = previousReview?.actionUseful === 'no' && Boolean(previousKind);
  const preferred = candidates.find((candidate) =>
    candidate.kind !== currentRejectedKind
    && (!avoidPreviousKind || candidate.kind !== previousKind)
  );
  const selected = preferred
    || candidates.find((candidate) => candidate.kind !== currentRejectedKind)
    || candidates[0];

  const result = {
    ...selected,
    context: { ...(selected.context || {}) },
  };

  if (!previousReview) return result;

  const adaptation = {
    source: 'evening_review',
    reviewDay: previousReview.day || null,
    planFit: previousReview.planFit || null,
    actionUseful: previousReview.actionUseful || null,
    previousKind,
    avoidedPreviousKind: Boolean(
      avoidPreviousKind
      && previousKind
      && selected.kind !== previousKind
    ),
    effortReduced: false,
  };

  if (previousReview.planFit === 'too_much') {
    const before = Number(result.effortMinutes);
    const after = reducedEffortMinutes(before);
    if (Number.isFinite(before) && Number.isFinite(after) && after < before) {
      result.effortMinutes = after;
      result.title = shortenTitle(result.title, before, after);
      result.rationale = `В прошлый раз план ощущался перегруженным, поэтому сегодня шаг короче. ${result.rationale}`;
      adaptation.effortReduced = true;
      adaptation.previousEffortMinutes = before;
      adaptation.adaptedEffortMinutes = after;
    }
  }

  result.context.adaptation = adaptation;
  return result;
}
