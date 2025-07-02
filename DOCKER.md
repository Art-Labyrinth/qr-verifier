# Docker развертывание QR Verifier

Это руководство описывает как запустить QR Verifier с помощью Docker и Docker Compose.

## Структура файлов

```
qr-verifier/
├── Dockerfile              # Основной Dockerfile для production
├── Dockerfile.dev          # Dockerfile для разработки
├── docker-compose.yml      # Основной compose файл
├── prod/
│   └── docker-compose.yml  # Production конфигурация
├── dev/
│   └── docker-compose.yml  # Development конфигурация
└── docker/
    ├── nginx.conf          # Конфигурация OpenResty/Nginx
    └── entrypoint.sh       # Скрипт запуска
```

## Быстрый старт

### Разработка

```bash
# 1. Перейдите в директорию проекта
cd qr-verifier

# 2. Запустите dev окружение
docker compose -f dev/docker-compose.yml up --build

# Приложение будет доступно на:
# - Frontend: http://localhost:5173 (Vite dev server)
```

### Продакшн

```bash
# 1. Создайте .env файлы
cp .env.example .env

# 2. Отредактируйте .env файлы для production

# 3. Запустите production
docker compose -f prod/docker-compose.yml up --build -d

# Приложение будет доступно на:
# - Frontend: http://localhost:80
# - Traefik Dashboard: http://localhost:8080
```

## Детальная настройка

### Environment файлы

#### Frontend (.env)
```env
VITE_SERVER_URL=http://api-server:3001
VITE_API_KEY=your-production-api-key
VITE_APP_NAME="QR Verifier"
VITE_APP_SHORT_NAME="QRVerifier"
```

### SSL/HTTPS с Traefik

Для включения HTTPS отредактируйте `prod/docker-compose.yml`:

```yaml
services:
  traefik:
    environment:
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_EMAIL=your-email@domain.com
    labels:
      - "traefik.http.routers.qr-verifier.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.qr-verifier.tls=true"
      - "traefik.http.routers.qr-verifier.tls.certresolver=letsencrypt"
```

## Команды управления

### Основные команды

```bash
# Запуск в фоне
docker compose up -d

# Пересборка и запуск
docker compose up --build

# Остановка
docker compose down

# Остановка с удалением volumes
docker compose down -v

# Просмотр логов
docker compose logs -f qr-verifier

# Выполнение команд в контейнере
docker compose exec qr-verifier sh
```

### Разработка

```bash
# Запуск dev окружения
docker compose -f dev/docker-compose.yml up

# Пересборка только frontend
docker compose -f dev/docker-compose.yml up --build qr-verifier-dev

# Подключение к БД
docker compose -f dev/docker-compose.yml exec postgres-dev psql -U qruser -d qrverifier_dev
```

### Продакшн

```bash
# Запуск production
docker compose -f prod/docker-compose.yml up -d

# Обновление приложения
docker compose -f prod/docker-compose.yml pull
docker compose -f prod/docker-compose.yml up -d

# Резервное копирование БД
docker compose -f prod/docker-compose.yml exec postgres pg_dump -U qruser qrverifier > backup.sql

# Восстановление БД
cat backup.sql | docker compose -f prod/docker-compose.yml exec -T postgres psql -U qruser qrverifier
```

## Мониторинг и логи

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f qr-verifier

# Последние 100 строк
docker compose logs --tail=100 qr-verifier

# Логи nginx
docker compose exec qr-verifier tail -f /var/log/nginx/access.log
```

### Мониторинг ресурсов

```bash
# Статистика контейнеров
docker stats

# Использование дискового пространства
docker system df

# Очистка неиспользуемых ресурсов
docker system prune -a
```

## Безопасность

### Рекомендации для продакшна

1. **Измените пароли по умолчанию**
   ```bash
   # Сгенерируйте сильные пароли
   openssl rand -base64 32
   ```

2. **Настройте файрвол**
   ```bash
   # Разрешите только необходимые порты
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

3. **Обновляйте образы регулярно**
   ```bash
   docker compose pull
   docker compose up -d
   ```

4. **Используйте секреты Docker**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

## Troubleshooting

### Общие проблемы

1. **Порт уже используется**
   ```bash
   # Найти процесс использующий порт
   lsof -i :80

   # Изменить порт в docker-compose.yml
   ports:
     - "8080:8080"
   ```

2. **Ошибки разрешений**
   ```bash
   # Проверить владельца файлов
   ls -la docker/

   # Исправить права доступа
   chmod +x docker/entrypoint.sh
   ```

3. **Проблемы с базой данных**
   ```bash
   # Проверить статус БД
   docker compose exec postgres pg_isready -U qruser

   # Пересоздать volume БД
   docker compose down -v
   docker compose up -d
   ```

4. **Ошибки сборки**
   ```bash
   # Очистить кэш Docker
   docker builder prune -a

   # Пересобрать без кэша
   docker compose build --no-cache
   ```

### Логи ошибок

```bash
# Детальные логи сборки
docker compose build --progress=plain --no-cache

# Проверка health checks
docker compose ps

# Инспектирование контейнера
docker compose exec qr-verifier sh
```

## Масштабирование

### Horizontal scaling

```bash
# Запуск нескольких экземпляров frontend
docker compose up --scale qr-verifier=3

# С load balancer
docker compose -f prod/docker-compose.yml -f prod/docker-compose.scale.yml up -d
```

### Оптимизация производительности

1. **Настройте nginx worker_processes**
2. **Используйте Redis для кэширования**
3. **Настройте connection pooling для БД**
4. **Включите gzip сжатие**

Все эти настройки уже включены в конфигурацию nginx.
