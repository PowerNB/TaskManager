TypeScript        — язык
Grammy            — Telegram bot framework
Grammy Sessions   — FSM диалогов
Prisma            — ORM
PostgreSQL        — основная БД
Redis             — сессии (Grammy) + очередь (BullMQ)
BullMQ            — планировщик задач

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
Bot Layer       знает о: Service Layer
Service Layer   знает о: Repository Layer, Utils
Repository Layer знает о: Infrastructure (Prisma)
Jobs Layer      знает о: Service Layer
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