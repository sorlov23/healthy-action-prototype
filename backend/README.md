# Healthy Action backend

Backend-контур для `v0.10 Real Food Flow`.

## Зафиксированная инфраструктура MVP

- **Hosting:** Beget VPS, РФ
- **Database:** PostgreSQL 17 на том же VPS на старте
- **API:** Node.js 22 + Fastify
- **Reverse proxy / HTTPS:** Caddy
- **Frontend:** текущая PWA на GitHub Pages до отдельного решения по production frontend
- **Photos:** не храним по умолчанию; если понадобится история снимков — S3-compatible storage в РФ

Backend не зависит от API Beget и переносим на любой обычный Linux + Docker + PostgreSQL.

## Что уже реализовано

### Food Catalog

- PostgreSQL-каталог продуктов;
- `pg_trgm` fuzzy search;
- алиасы и русская нормализация;
- импорт текущего `../food-catalog.js` в PostgreSQL;
- детерминированный Food Resolver для известных продуктов.

### Auth

Для MVP используется guest/device session без email и пароля:

- клиент получает криптографически случайный bearer token;
- в PostgreSQL хранится только SHA-256 hash токена;
- сессия имеет срок действия и может быть отозвана;
- email/телефон для работы MVP не требуется.

### Серверное состояние

Есть модели и API для:

- профиля/onboarding;
- food logs и позиций еды;
- веса;
- воды;
- шагов;
- дневных привычек;
- объединённого состояния дня;
- bootstrap-снимка приложения;
- полного удаления guest-account со всеми связанными данными.

PWA остаётся local-first: локальная запись выполняется сразу, сервер получает данные в фоне. До подключения Beget `apiBase` пустой, поэтому существующий прототип работает полностью автономно.

## API v1

Публичные health/catalog endpoints:

- `GET /health`
- `GET /ready`
- `GET /api/v1/foods/search?q=кур&limit=6`
- `POST /api/v1/food/resolve`

Auth / account:

- `POST /api/v1/auth/guest`
- `GET /api/v1/auth/me`
- `DELETE /api/v1/account`

Profile:

- `GET /api/v1/profile`
- `PUT /api/v1/profile`

Food logs:

- `POST /api/v1/food/logs`
- `GET /api/v1/food/logs?day=YYYY-MM-DD&timezoneOffsetMinutes=0`

Weight / daily state:

- `POST /api/v1/weight/logs`
- `GET /api/v1/weight/logs?limit=90`
- `POST /api/v1/daily/metrics`
- `PUT /api/v1/daily/habits/:habit`
- `GET /api/v1/day?day=YYYY-MM-DD&timezoneOffsetMinutes=0`

Bootstrap:

- `GET /api/v1/bootstrap?day=YYYY-MM-DD&timezoneOffsetMinutes=0`

Bootstrap возвращает профиль, состояние выбранного дня, последние записи веса и server time одним запросом.

Все персональные endpoints требуют `Authorization: Bearer <token>`.

## Первый локальный запуск

Из папки `backend`:

```bash
cp .env.example .env
# обязательно замени пароль БД перед реальным VPS
export POSTGRES_PASSWORD='change-me'
docker compose up -d postgres
docker compose build api
docker compose run --rm api npm run migrate
docker compose run --rm api npm run seed:foods
docker compose up -d api
```

Быстрая проверка:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/ready
curl 'http://127.0.0.1:8080/api/v1/foods/search?q=кур&limit=6'
curl -X POST http://127.0.0.1:8080/api/v1/food/resolve \
  -H 'content-type: application/json' \
  -d '{"text":"куриная грудка с рисом"}'
```

## Production на Beget

Подготовлены:

- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.prod.example`

На production PostgreSQL не должен публиковаться наружу. Caddy принимает внешний HTTPS-трафик и проксирует его к API внутри Docker-сети.

До покупки VPS production hostname не фиксируем. После появления домена/API-host нужно будет:

1. создать `.env.prod` из шаблона;
2. указать production hostname;
3. применить migrations + seed;
4. поднять production compose;
5. проверить `/health` и `/ready` по HTTPS;
6. вписать HTTPS API URL в корневой `runtime-config.js`;
7. увеличить PWA asset revision.

## CI

`backend ci` поднимает настоящий PostgreSQL 17 и проверяет полный жизненный цикл MVP:

- migrations и импорт Food Catalog;
- поиск и Food Resolver;
- guest auth;
- отсутствие plaintext session token в БД;
- profile persistence;
- food log persistence;
- вес, воду, шаги и привычки;
- day overview;
- bootstrap;
- каскадное удаление account/data и инвалидирование сессии.

## Security baseline

- секреты только через `.env`, никогда не коммитить;
- PostgreSQL не публиковать наружу;
- наружу только HTTPS через Caddy;
- bearer token хранится на сервере только как hash;
- перед production включить firewall и backup policy;
- не хранить фотографии еды без продуктовой необходимости;
- удаление guest-account уже каскадно удаляет связанные серверные данные.

## Следующие этапы

1. Безопасная initial reconciliation при запуске PWA, без дублирования локальных событий.
2. Добавить idempotency/client event IDs для надёжной повторной синхронизации.
3. Развернуть API на Beget.
4. Переключить `runtime-config.js` на production API.
5. Добавить AI provider как fallback для сложных фраз.
6. Подключить Vision provider к тому же Food Resolver-контракту.
7. Формировать серверный `Next Action / Coach` из реального состояния дня.
