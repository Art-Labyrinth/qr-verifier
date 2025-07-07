# QR Verifier

QR код верификатор - простое веб-приложение для проверки и создания QR кодов.

## Быстрый запуск

### С Docker (рекомендуется)

```bash
# Собрать и запустить приложение
make start

# Или напрямую через docker-compose
docker compose up -d

# Остановить
make stop
```

Приложение будет доступно по адресу: http://localhost

### Для разработки

```bash
# Запуск dev окружения (порт 3000)
make dev

# Остановка dev окружения
make dev-stop
```

### Для продакшена

```bash
# Запуск production окружения (порт 80)
make prod

# Остановка production окружения
make prod-stop
```

## Команды

- `make help` - показать все доступные команды
- `make build` - собрать Docker образ
- `make clean` - очистить контейнеры и образы
- `make logs` - показать логи

## Архитектура

Приложение состоит из:
- **Frontend**: React + TypeScript + Vite
- **Web Server**: OpenResty (nginx + Lua)
- **Container**: Docker с multi-stage сборкой

Статические файлы собираются во время сборки Docker образа и размещаются в OpenResty для высокопроизводительной отдачи.

## Требования

- Docker
- Docker Compose
- Make (опционально, для удобства)

## Структура проекта

```
├── src/                 # Исходный код приложения
├── public/              # Статические файлы
├── docker/              # Docker конфигурация
│   ├── nginx.conf       # Конфигурация OpenResty
│   └── entrypoint.sh    # Скрипт запуска
├── dev/                 # Dev окружение
│   └── docker-compose.yml
├── prod/                # Production окружение
│   └── docker-compose.yml
├── Dockerfile           # Основной Docker файл
├── docker-compose.yml   # Основной compose файл
└── Makefile             # Команды для управления
```

## Технологии

- React 18 + TypeScript + Vite
- OpenResty (nginx + Lua)
- Docker multi-stage сборка
- GitHub Actions CI/CD
