import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(__dirname, '../../food-catalog.js');

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9%]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readCatalogItem(item) {
  if (Array.isArray(item)) {
    const [id, name, aliases, kcal100, protein100, portion, icon] = item;
    return {
      id,
      name,
      aliases: String(aliases || '').split('|').filter(Boolean),
      kcal100,
      protein100,
      portion,
      icon,
    };
  }
  return {
    id: item.id,
    name: item.name,
    aliases: Array.isArray(item.aliases) ? item.aliases : String(item.aliases || '').split('|').filter(Boolean),
    kcal100: item.kcal100,
    protein100: item.protein100,
    portion: item.portion,
    icon: item.icon,
  };
}

const source = await fs.readFile(catalogPath, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'food-catalog.js' });

const rawCatalog = sandbox.window.HEALTHY_FOOD_CATALOG;
if (!Array.isArray(rawCatalog) || rawCatalog.length === 0) {
  throw new Error('Food Catalog is empty or unreadable');
}

const catalog = rawCatalog.map(readCatalogItem);
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query('begin');

  for (const food of catalog) {
    await client.query(`
      insert into foods (
        id, name, normalized_name, kcal_100, protein_100,
        default_portion_g, icon, source, source_id, is_active, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,'healthy_action_seed',$1,true,now())
      on conflict (id) do update set
        name = excluded.name,
        normalized_name = excluded.normalized_name,
        kcal_100 = excluded.kcal_100,
        protein_100 = excluded.protein_100,
        default_portion_g = excluded.default_portion_g,
        icon = excluded.icon,
        is_active = true,
        updated_at = now()
    `, [
      food.id,
      food.name,
      normalize(food.name),
      Number(food.kcal100),
      Number(food.protein100 || 0),
      Number(food.portion),
      food.icon || null,
    ]);

    const aliases = [...new Set([food.name, ...(food.aliases || [])].map((x) => String(x).trim()).filter(Boolean))];
    for (const alias of aliases) {
      await client.query(`
        insert into food_aliases(food_id, alias, normalized_alias)
        values($1,$2,$3)
        on conflict(food_id, normalized_alias) do update set alias = excluded.alias
      `, [food.id, alias, normalize(alias)]);
    }
  }

  await client.query('commit');
  console.log(`Imported ${catalog.length} foods`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
