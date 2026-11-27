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

Пример: `/live/timur-sever`. Ссылки на `/browse`, `/following`, `/multiview`, `/search` уже стоят в интерфейсе — эти страницы следующий этап.

## Структура

```
src/
  app/                    маршруты (только сборка страниц из компонентов)
    layout.tsx            шрифт, шапка, нижняя панель
    globals.css           дизайн-токены: цвета, радиусы, тени
    page.tsx              главная
    live/[channel]/       страница эфира
    not-found.tsx         404
  components/
    ui/                   базовые кирпичи: Button, Icon, Avatar, Badge, Tag,
                          Thumbnail, AutoGrid, Section, SegmentedControl, SparksBalance
    layout/               каркас: Header, Logo, FollowingSidebar, MobileNav, PageShell
    home/                 блоки главной: FeaturedHero, FollowingStrip, StreamsForYou
    stream/               карточки эфира: StreamCard, StreamListItem
    moments/              MomentCard
    category/             CategoryCard
    watch/                страница эфира: Player (+ Timeline, PlayerControls),
                          StreamStage, StreamMoments, ChannelBar (+ FollowButton)
    chat/                 ChatPanel, ChatLine, ChatComposer, PredictionCard, chatBadge
  config/navigation.ts    разделы сайта (общие для шапки и нижней панели)
  data/
    api.ts                ЕДИНСТВЕННАЯ точка получения данных
    mock.ts               тестовые данные (импортируются только из api.ts)
  lib/
    format.ts             числа, склонения, длительность по-русски
    routes.ts             построение URL
  theme/tones.ts          пастельная палитра и подписи типов моментов
  types/index.ts          доменные типы
```

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
