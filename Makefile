# Makefile для QR Verifier

.PHONY: help build dev prod stop clean logs test

# Переменные
PROJECT_NAME=qr-verifier
COMPOSE_DEV=dev/docker-compose.yml
COMPOSE_PROD=prod/docker-compose.yml
COMPOSE_MAIN=docker-compose.yml

# Цвета для вывода
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

help: ## Показать справку
	@echo "$(GREEN)QR Verifier - Команды управления$(NC)"
	@echo ""
	@echo "$(YELLOW)Основные команды:$(NC)"
	@echo "  make start            - Запустить приложение (основной docker-compose)"
	@echo "  make stop             - Остановить приложение"
	@echo ""
	@echo "$(YELLOW)Разработка:$(NC)"
	@echo "  make dev              - Запустить dev окружение"
	@echo "  make dev-build        - Пересобрать и запустить dev"
	@echo "  make dev-stop         - Остановить dev окружение"
	@echo ""
	@echo "$(YELLOW)Продакшн:$(NC)"
	@echo "  make prod             - Запустить production"
	@echo "  make prod-build       - Пересобрать и запустить prod"
	@echo "  make prod-stop        - Остановить production"
	@echo ""
	@echo "$(YELLOW)Утилиты:$(NC)"
	@echo "  make build            - Собрать Docker образ"
	@echo "  make test             - Запустить тесты"
	@echo "  make logs             - Показать логи"
	@echo "  make clean            - Очистить все контейнеры и образы"

# Основные команды
start: ## Запустить приложение (основной docker-compose)
	@echo "$(GREEN)Запуск QR Verifier...$(NC)"
	docker compose -f $(COMPOSE_MAIN) up -d

stop: ## Остановить приложение
	@echo "$(YELLOW)Остановка QR Verifier...$(NC)"
	docker compose -f $(COMPOSE_MAIN) down

restart: ## Перезапустить приложение
	@echo "$(YELLOW)Перезапуск QR Verifier...$(NC)"
	docker compose -f $(COMPOSE_MAIN) restart

# Разработка
dev: ## Запустить dev окружение
	@echo "$(GREEN)Запуск dev окружения...$(NC)"
	docker compose -f $(COMPOSE_DEV) up

dev-build: ## Пересобрать и запустить dev
	@echo "$(GREEN)Пересборка и запуск dev окружения...$(NC)"
	docker compose -f $(COMPOSE_DEV) up --build

dev-stop: ## Остановить dev окружение
	@echo "$(YELLOW)Остановка dev окружения...$(NC)"
	docker compose -f $(COMPOSE_DEV) down

dev-logs: ## Показать логи dev окружения
	docker compose -f $(COMPOSE_DEV) logs -f

# Продакшн
prod: ## Запустить production
	@echo "$(GREEN)Запуск production окружения...$(NC)"
	docker compose -f $(COMPOSE_PROD) up -d

prod-build: ## Пересобрать и запустить prod
	@echo "$(GREEN)Пересборка и запуск production...$(NC)"
	docker compose -f $(COMPOSE_PROD) up --build -d

prod-stop: ## Остановить production
	@echo "$(YELLOW)Остановка production...$(NC)"
	docker compose -f $(COMPOSE_PROD) down

prod-logs: ## Показать логи production
	docker compose -f $(COMPOSE_PROD) logs -f

# Общие команды
build: ## Собрать Docker образ
	@echo "$(GREEN)Сборка Docker образа...$(NC)"
	docker build -t $(PROJECT_NAME):latest .

test: ## Запустить тесты
	@echo "$(GREEN)Запуск тестов...$(NC)"
	npm test

logs: ## Показать логи (по умолчанию dev)
	docker compose -f $(COMPOSE_DEV) logs -f

status: ## Показать статус контейнеров
	@echo "$(GREEN)Статус контейнеров:$(NC)"
	docker compose -f $(COMPOSE_DEV) ps
	@echo ""
	docker compose -f $(COMPOSE_PROD) ps

# Управление контейнерами
shell: ## Подключиться к контейнеру приложения
	docker compose -f $(COMPOSE_DEV) exec qr-verifier-dev sh

shell-prod: ## Подключиться к prod контейнеру
	docker compose -f $(COMPOSE_PROD) exec qr-verifier sh

# Очистка
clean: ## Очистить контейнеры и образы
	@echo "$(YELLOW)Остановка всех контейнеров...$(NC)"
	docker compose -f $(COMPOSE_DEV) down -v 2>/dev/null || true
	docker compose -f $(COMPOSE_PROD) down -v 2>/dev/null || true
	@echo "$(YELLOW)Удаление образов $(PROJECT_NAME)...$(NC)"
	docker images | grep $(PROJECT_NAME) | awk '{print $$3}' | xargs -r docker rmi -f
	@echo "$(YELLOW)Очистка неиспользуемых ресурсов...$(NC)"
	docker system prune -f

clean-all: ## Полная очистка (включая volumes)
	@echo "$(RED)ВНИМАНИЕ: Это удалит ВСЕ данные!$(NC)"
	@read -p "Продолжить? (y/N): " confirm && [ "$$confirm" = "y" ]
	docker compose -f $(COMPOSE_DEV) down -v
	docker compose -f $(COMPOSE_PROD) down -v
	docker system prune -a -f --volumes

# Управление контейнерами
shell: ## Подключиться к контейнеру приложения
	docker compose -f $(COMPOSE_DEV) exec qr-verifier-dev sh

shell-prod: ## Подключиться к prod контейнеру
	docker compose -f $(COMPOSE_PROD) exec qr-verifier sh

# Мониторинг
stats: ## Показать статистику использования ресурсов
	docker stats

disk-usage: ## Показать использование дискового пространства Docker
	docker system df

# Обновление
update: ## Обновить production (pull + restart)
	@echo "$(GREEN)Обновление production...$(NC)"
	docker compose -f $(COMPOSE_PROD) pull
	docker compose -f $(COMPOSE_PROD) up -d

# Проверка системы
check: ## Проверить требования системы
	@echo "$(GREEN)Проверка системы...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker не установлен!$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo "$(RED)Docker Compose не установлен!$(NC)"; exit 1; }
	@echo "$(GREEN)Система готова к работе!$(NC)"

install: check ## Полная установка (проверка системы)
	@echo "$(GREEN)QR Verifier готов к использованию!$(NC)"
	@echo "$(YELLOW)Следующие шаги:$(NC)"
	@echo "1. Запустите: make dev (для разработки) или make prod (для продакшена)"

.DEFAULT_GOAL := help
