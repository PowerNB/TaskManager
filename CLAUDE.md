instructuion: If you need to reason something for yourself, do so in English. For explanation something for user explane in Russian


TypeScript        — язык
Grammy            — Telegram bot framework
Grammy Sessions   — FSM диалогов
Prisma            — ORM
PostgreSQL        — основная БД
Redis             — сессии (Grammy) + очередь (BullMQ)
BullMQ            — планировщик задач

Следи за прогрессом выполнения через файл PROGRESS_TRACKER.md
Веди прогресс выполения при помощи файла PROGRESS_TRACKER.md - записывай прогрес в этот файл и меняй его по выполнению задач

Используй context 7 для получения актуальной информации о стеке

В будущем нужно будет реализовать такую структуру бота как описано в "C:\Users\Proger4\TaskManager\docs\ТЗ для бота.md". Не имплементируй ничего из этого тз без явного запроса пользователя или, если на каком-то этапе что-то необходимо будет сделать из тз, спрашивай у пользователя.

Следуй текущей архитектуре.

Стек:
TypeScript        — язык
Grammy            — Telegram bot framework
Grammy Sessions   — FSM диалогов
Prisma            — ORM
PostgreSQL        — основная БД
Redis             — сессии (Grammy) + очередь (BullMQ)
BullMQ            — планировщик задач

Фичи из ТЗ
1. onboarding
Первый запуск, сбор настроек — timezone, время брифа, тихие часы.
2. capture
Захват задачи — многошаговый диалог, FSM, сохранение в БД.
3. lifecycle
Автоархивация задач — переходы ACTIVE → FROZEN → ARCHIVED → DELETED. Запускается из субботнего брифа.
4. notifications
Напоминания — делегирование, дедлайн по дате, дедлайн по времени.
5. brief/morning
Утренний бриф — планирование дня, подбор задач по времени и категории.
6. brief/saturday
Субботний бриф — статистика, задачи без движения, холодильник, архив.
7. elo
Приоритизация — ELO сессия, пересчёт баллов, выбор пар.
8. settings
Изменение настроек через /settings — timezone, время брифа, тихие часы.


Будем использовать Layered паттер т.к до featured based просто не дотягивает кол-во фич 

Вот такие слои: 

1. Bot Layer (bot/)
Всё что связано с Telegram. Handlers принимают update от пользователя и вызывают сервисы. Middlewares — сессии, авторизация. Больше ничего не знает.
2. Service Layer (services/)
Вся бизнес-логика. Захват задачи, жизненный цикл, ELO, брифы. Не знает о Telegram и Prisma. Только логика.
3. Repository Layer (repositories/)
Только работа с БД через Prisma. Никакой логики — только CRUD и запросы. Сервисы не знают о Prisma напрямую.
4. Jobs Layer (jobs/)
BullMQ воркеры. Утренний бриф, субботний бриф, напоминания. Запускают сервисы по расписанию. Не знают о Telegram напрямую — только вызывают сервисы.
5. Infrastructure Layer (infrastructure/)
Инициализация внешних зависимостей — Prisma, Redis, BullMQ. Один раз настроил, везде импортируешь.
6. Utils (utils/)
Чистые функции без состояния — формула ELO, работа с timezone, проверка тихих часов. Не слой в строгом смысле, но нужен всем слоям.




Вот так они взаимодействуют: 

Telegram
    ↓
Bot Layer       — принял update, вызвал service
    ↓
Service Layer   — выполнил логику, вызвал repository
    ↓
Repository Layer — сходил в БД, вернул данные
    ↓
PostgreSQL

Jobs Layer      — запускается по расписанию через BullMQ
    ↓
Service Layer   — тот же сервисный слой что и у бота
    ↓
Repository Layer



Важно понимать: 
Bot Layer       знает только о: Service Layer
Service Layer   знает только о: Repository Layer, Utils
Repository Layer знает только о: Infrastructure (Prisma)
Jobs Layer      знает только о: Service Layer
Utils           не знает ни о ком
Infrastructure  не знает ни о ком


Т.к слои занают о соседях, но не более

bot/
├── index.ts                — инициализация бота, регистрация handlers и middlewares
├── handlers/
│   ├── capture.handler.ts
│   ├── onboarding.handler.ts
│   ├── settings.handler.ts
│   └── elo.handler.ts
└── middlewares/
    ├── session.ts          — подключение Grammy sessions + Redis
    └── auth.ts             — проверка пользователя в БД

services/
├── capture.service.ts
├── lifecycle.service.ts
├── elo.service.ts
├── notification.service.ts
├── settings.service.ts
└── brief/
    ├── morning.service.ts
    └── saturday.service.ts

jobs/
├── index.ts                — регистрация всех воркеров BullMQ
├── morning-brief.job.ts
├── saturday-brief.job.ts
└── notifications.job.ts

infrastructure/
├── prisma.ts               — инициализация Prisma клиента
├── redis.ts                — инициализация Redis клиента
└── bullmq.ts               — инициализация очередей BullMQ

utils/
├── time.ts                 — работа с timezone, тихие часы, проверка canSend()
└── elo.ts                  — формула пересчёта ELO

И отдельная папка types
При чем в types, мы храним типы, которые используются во всем проекте, если тип нужен только для слоя, пишем его только в слое

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
