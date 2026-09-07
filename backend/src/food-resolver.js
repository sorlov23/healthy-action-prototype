import { pool } from './db.js';
import { normalizeFoodText } from './food-search.js';

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

export async function resolveFoodText(text) {
  const normalized = normalizeFoodText(text);
  if (normalized.length < 2) {
    return { text, normalized, items: [], needsReview: true };
  }

  const { rows } = await pool.query(`
    select
      f.id,
      f.name,
      f.icon,
      f.kcal_100,
      f.protein_100,
      f.fat_100,
      f.carbs_100,
      f.default_portion_g,
      a.alias,
      a.normalized_alias,
      position(a.normalized_alias in $1) as match_pos,
      char_length(a.normalized_alias) as match_len
    from food_aliases a
    join foods f on f.id = a.food_id
    where f.is_active = true
      and char_length(a.normalized_alias) >= 3
      and position(a.normalized_alias in $1) > 0
    order by match_len desc, f.name asc
  `, [normalized]);

  const selected = [];
  const seenFoods = new Set();

  for (const row of rows) {
    if (seenFoods.has(row.id)) continue;
    const start = Number(row.match_pos) - 1;
    const end = start + Number(row.match_len);
    const span = { start, end };
    if (selected.some((item) => overlaps(span, item.span))) continue;

    const grams = Number(row.default_portion_g);
    const kcal100 = Number(row.kcal_100);
    const protein100 = Number(row.protein_100);

    selected.push({
      span,
      food: {
        id: row.id,
        name: row.name,
        icon: row.icon,
        kcal100,
        protein100,
        fat100: row.fat_100 == null ? null : Number(row.fat_100),
        carbs100: row.carbs_100 == null ? null : Number(row.carbs_100),
        portion: grams,
      },
      matchedAlias: row.alias,
      grams,
      kcal: Math.round(kcal100 * grams) / 100,
      protein: Math.round(protein100 * grams) / 100,
      confidence: 0.9,
    });
    seenFoods.add(row.id);
  }

  selected.sort((a, b) => a.span.start - b.span.start);

  const items = selected.map(({ span, ...item }) => item);
  const totals = items.reduce((acc, item) => {
    acc.kcal += item.kcal;
    acc.protein += item.protein;
    return acc;
  }, { kcal: 0, protein: 0 });

  return {
    text,
    normalized,
    resolver: 'catalog-alias-v1',
    items,
    totals: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
    },
    needsReview: items.length === 0,
  };
}
