# Инструкция по развертыванию QR Verifier

## Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd qr-verifier

# 2. Установите зависимости
npm install

# 3. Создайте файл конфигурации
cp .env.example .env

# 4. Запустите в режиме разработки
npm run dev
```

Приложение будет доступно по адресу http://localhost:5173

## Настройка переменных окружения

Отредактируйте файл `.env`:

```env
# URL вашего API сервера
VITE_SERVER_URL=https://your-api-server.com

# API ключ для авторизации (необязательно)
VITE_API_KEY=your-secret-api-key

# Настройки PWA
VITE_APP_NAME="QR Verifier"
VITE_APP_SHORT_NAME="QRVerifier"
```

## Сборка для продакшена

```bash
npm run build
```

Собранные файлы будут в папке `dist/`. Загрузите содержимое этой папки на ваш веб-сервер.

## Настройка сервера API

Приложение ожидает REST API со следующими эндпоинтами:

### POST /api/qr-records
Создание новой записи о сканировании.

**Тело запроса:**
```json
{
  "qrCode": "string",
  "isValid": boolean,
  "timestamp": "ISO date string",
  "data": {}
}
```

**Ответ:**
```json
{
  "id": "server-record-id",
  "qrCode": "string",
  "isValid": boolean,
  "timestamp": "ISO date string",
  "data": {}
}
```

### GET /api/qr-records?since=<timestamp>
Получение записей, созданных после указанной даты.

**Ответ:**
```json
[
  {
    "id": "server-record-id",
    "qrCode": "string",
    "isValid": boolean,
    "timestamp": "ISO date string",
    "data": {}
  }
]
```

## Настройка веб-сервера

### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/qr-verifier/dist;
    index index.html;

    # PWA файлы
    location /sw.js {
        add_header Cache-Control "no-cache";
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        expires off;
        access_log off;
    }

    location /manifest.webmanifest {
        add_header Cache-Control "public, max-age=604800";
    }

    # SPA маршрутизация
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/qr-verifier/dist

    # PWA файлы
    <Files "sw.js">
        Header set Cache-Control "no-cache"
    </Files>

    # SPA маршрутизация
    <Directory /path/to/qr-verifier/dist>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Кэширование
    <Directory /path/to/qr-verifier/dist/assets>
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
    </Directory>
</VirtualHost>
```

## HTTPS

Для полной функциональности PWA требуется HTTPS. Используйте Let's Encrypt:

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Проверка PWA

1. Откройте DevTools в Chrome/Edge
2. Перейдите на вкладку "Application" > "Manifest"
3. Проверьте, что манифест загружается без ошибок
4. Во вкладке "Service Workers" проверьте, что SW регистрируется
5. Попробуйте добавить приложение на главный экран

## Мониторинг

Для отслеживания ошибок и производительности рекомендуется:

- **Sentry** для отслеживания ошибок
- **Google Analytics** для аналитики
- **Lighthouse** для аудита PWA

## Troubleshooting

### Проблемы с камерой
- Убедитесь, что сайт использует HTTPS
- Проверьте разрешения браузера для доступа к камере

### Проблемы с Service Worker
- Очистите кэш браузера
- Проверьте консоль на наличие ошибок
- Убедитесь, что файл sw.js доступен

### Проблемы с синхронизацией
- Проверьте настройки CORS на API сервере
- Убедитесь, что API эндпоинты доступны
- Проверьте настройки переменных окружения
