import { pool } from './db.js';

export function normalizeFoodText(value = '') {
  return String(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9%]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchFoods(query, limit = 6) {
  const q = normalizeFoodText(query);
  if (q.length < 2) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 20);

  const sql = `
    with ranked as (
      select
        f.id,
        f.name,
        f.kcal_100,
        f.protein_100,
        f.fat_100,
        f.carbs_100,
        f.default_portion_g,
        f.icon,
        greatest(
          similarity(f.normalized_name, $1),
          case when f.normalized_name = $1 then 2.0 else 0 end,
          case when f.normalized_name like $1 || '%' then 1.6 else 0 end,
          coalesce(max(similarity(a.normalized_alias, $1)), 0),
          coalesce(max(case when a.normalized_alias = $1 then 1.9 else 0 end), 0),
          coalesce(max(case when a.normalized_alias like $1 || '%' then 1.5 else 0 end), 0)
        ) as score
      from foods f
      left join food_aliases a on a.food_id = f.id
      where f.is_active = true
        and (
          f.normalized_name % $1
          or f.normalized_name like '%' || $1 || '%'
          or a.normalized_alias % $1
          or a.normalized_alias like '%' || $1 || '%'
        )
      group by f.id
    )
    select *
    from ranked
    order by score desc, name asc
    limit $2;
  `;

  const { rows } = await pool.query(sql, [q, safeLimit]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    kcal100: Number(row.kcal_100),
    protein100: Number(row.protein_100),
    fat100: row.fat_100 == null ? null : Number(row.fat_100),
    carbs100: row.carbs_100 == null ? null : Number(row.carbs_100),
    portion: Number(row.default_portion_g),
    score: Number(row.score),
  }));
}
