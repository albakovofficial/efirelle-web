# Efirelle — платформа живых трансляций (фронтенд)

Next.js 16 (App Router) + TypeScript + CSS Modules. Без UI-библиотек: все компоненты свои.

## Запуск

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # проверка типов
npm run build      # продакшен-сборка
```

## Страницы

| Адрес | Что это |
| --- | --- |
| `/` | Главная: витрина, живые моменты, категории, лента «Для вас» |
| `/live/[channel]` | Эфир: плеер с перемоткой и отметками, канал, моменты, чат с прогнозом |
| `/browse` | Обзор: все категории и все эфиры, самые популярные первыми |
| `/browse/[category]` | Категория: обложка, эфиры внутри, кнопка «Открыть в мультиэфире» |
| `/following` | Отслеживаемые: эфиры подписок и все каналы, включая тех, кто не в сети |
| `/search?q=…` | Поиск по эфирам (название, канал, категория, теги), каналам и категориям |
| `/multiview?c=slug1,slug2` | Мультиэфир: до 4 эфиров на экране, звук у одного; выбор хранится в адресе |

Примеры: `/live/timur-sever`, `/browse/music`, `/search?q=музыка`, `/multiview?c=mira,timur-sever`.

## Структура

```
src/
  app/                    маршруты (только сборка страниц из компонентов)
    layout.tsx            шрифт, шапка, нижняя панель
    globals.css           дизайн-токены: цвета, радиусы, тени
    page.tsx              главная
    live/[channel]/       страница эфира
    browse/               обзор и страница категории ([category])
    following/            отслеживаемые
    search/               поиск
    multiview/            мультиэфир
    not-found.tsx         404
  components/
    ui/                   базовые кирпичи: Button, Icon, Avatar, Badge, Tag, Thumbnail,
                          AutoGrid, Section, PageHeader, SegmentedControl, SparksBalance
    layout/               каркас: Header, Logo, FollowingSidebar, MobileNav, PageShell
    home/                 блоки главной: FeaturedHero, FollowingStrip, StreamsForYou
    stream/               карточки эфира: StreamCard, StreamListItem
    moments/              MomentCard
    category/             CategoryCard
    channel/              ChannelCard (канал со статусом: в эфире / не в сети)
    multiview/            MultiviewBoard (сетка мультиэфира и выбор эфиров)
    watch/                страница эфира: Player (+ Timeline, PlayerControls),
                          StreamStage, StreamMoments, ChannelBar (+ FollowButton)
    chat/                 ChatPanel, ChatLine, ChatComposer, PredictionCard, chatBadge
  config/navigation.ts    разделы сайта (общие для шапки и нижней панели)
  config/multiview.ts     лимит эфиров на экране мультиэфира
  data/
    api.ts                ЕДИНСТВЕННАЯ точка получения данных
    mock.ts               тестовые данные (импортируются только из api.ts)
  lib/
    format.ts             числа, склонения, длительность по-русски
    routes.ts             построение URL
  theme/tones.ts          пастельная палитра и подписи типов моментов
  types/index.ts          доменные типы
```

## Выкладка

Сайт работает на https://efirelle.ru (сервер Selectel, настройка — `deploy/server-setup.sh`).

1. Пуш в `main` запускает GitHub Actions (`.github/workflows/ci.yml`): зависимости, сборка, проверка типов.
2. Если всё прошло, коммит переносится в ветку `production`.
3. Сразу после этого Actions даёт сигнал серверу (`POST /_deploy-hook`), и сервер собирает и перезапускает сайт. Если сигнал не дошёл, сервер подхватит версию сам: он проверяет `production` каждые 15 секунд. От пуша до сайта обычно проходит 1,5–2 минуты: проверка в GitHub и сборка на сервере.
4. Изменения в `deploy/install-autodeploy.sh` применяются на сервере сами после следующей выкладки.

Сломанная сборка до сервера не доходит. Включить автовыкладку на сервере (один раз, от root):

```bash
curl -fsSL https://raw.githubusercontent.com/albakovofficial/efirelle-web/main/deploy/install-autodeploy.sh | bash
```

Логи выкладки: `journalctl -u efirelle-autodeploy`. Выложить вручную: `efirelle-deploy`.

## Правила кода

- **Один компонент — одна папка**: `Component.tsx` + `Component.module.css`.
- **Данные только через `data/api.ts`.** Чтобы подключить бэкенд, меняются тела функций там — страницы и компоненты не трогаются.
- **Без дублей.** Иконки — только в `ui/Icon`, кнопки — только `ui/Button`, бейдж эфира — `LiveBadge`, форматирование — `lib/format`, адреса — `lib/routes`.
- **Серверные компоненты по умолчанию.** `"use client"` только там, где есть состояние: фильтры, чат, плеер, сворачивание панели, подсветка навигации.
- **Цвета — из токенов** (`globals.css`) и тонов (`theme/tones.ts`), в компонентах нет «магических» hex-значений.
- **Доступность**: настоящие `<button>` и `<a>`, подписи у иконок-кнопок, перемотка — нативный `range` (работает с клавиатуры).

## Что дальше

1. Видео: заменить `Thumbnail` в `watch/Player/Player.tsx` на `<video>` с HLS.
2. Чат в реальном времени: WebSocket в `chat/ChatPanel/ChatPanel.tsx`.
3. Страницы обзора, отслеживаемых, поиска и мультиэфира.
4. Авторизация, искры и прогнозы на сервере.
