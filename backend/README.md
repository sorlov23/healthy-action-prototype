# Healthy Action backend

Первый backend-контур для `v0.10 Real Food Flow`.

## Зафиксированная инфраструктура MVP

- **Hosting:** Beget VPS, РФ
- **Database:** PostgreSQL 17 на том же VPS на старте
- **API:** Node.js 22 + Fastify
- **Frontend:** текущая PWA на GitHub Pages до отдельного решения по production frontend
- **Photos:** не храним по умолчанию; когда понадобится хранение — S3-compatible storage в РФ

Backend не зависит от Beget API и переносим на любой обычный Linux + PostgreSQL.

## Уже реализовано

- PostgreSQL schema для food catalog и базового пользовательского state
- `pg_trgm` fuzzy search и алиасы продуктов
- импорт текущего `../food-catalog.js` в PostgreSQL
- `GET /health`
- `GET /ready`
- `GET /api/v1/foods/search?q=кур&limit=6`
- `POST /api/v1/food/resolve` — первый детерминированный resolver по алиасам каталога
- CORS для текущей PWA
- Docker Compose для локальной разработки и будущего VPS
- GitHub Actions smoke test с настоящим PostgreSQL 17

## Первый запуск

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

Проверка:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/ready
curl 'http://127.0.0.1:8080/api/v1/foods/search?q=кур&limit=6'
curl -X POST http://127.0.0.1:8080/api/v1/food/resolve \
  -H 'content-type: application/json' \
  -d '{"text":"куриная грудка с рисом"}'
```

Ожидаемый смысл ответа search:

```json
{
  "query": "кур",
  "items": [
    {
      "id": "chicken_breast",
      "name": "Куриная грудка",
      "icon": "🍗",
      "kcal100": 165,
      "protein100": 31,
      "portion": 150
    }
  ]
}
```

Resolver сейчас намеренно не использует LLM: он находит известные продукты и их алиасы в свободной фразе и возвращает структуру для подтверждения пользователем. Позже AI/Vision будут подключены внутри этого же контракта.

## Что дальше

1. Переключить autocomplete PWA с локального JS-каталога на `/api/v1/foods/search` с локальным fallback.
2. Подключить PWA к `/api/v1/food/resolve` и экрану подтверждения состава.
3. Добавить создание пользователя/профиля и серверное сохранение food logs.
4. Добавить AI provider как fallback resolver для сложных фраз.
5. Подключить Vision provider к тому же resolver-контракту.
6. Поднять API на Beget, когда backend будет готов к реальному использованию.

## Security baseline

- секреты только через `.env`, никогда не коммитить;
- PostgreSQL не публиковать наружу;
- API слушает `127.0.0.1:8080` в Compose, наружу позже только через HTTPS reverse proxy;
- перед production включить firewall, backup policy и отдельного непривилегированного пользователя VPS;
- auth будет добавлен до записи реальных персональных данных.
