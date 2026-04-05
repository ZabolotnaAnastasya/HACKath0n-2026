# Обробник Телеметрії Дронів та 3D Візуалізатор

Автоматизований розбір логів Ardupilot з WebGL-візуалізацією траєкторії.

## Технологічний Стек
- **Бекенд**: FastAPI, NumPy, SciPy (математичне ядро)
- **Фронтенд**: React + Three.js (WebGL рендеринг)
- **Інфраструктура**: Docker Compose

## Швидкий Запуск
```bash
docker compose up --build
```

## Сервіси
- **API/Swagger**: http://localhost:8000
- **Інтерфейс**: http://localhost:3000
- **N8N Workflow**: http://localhost:5678

## Архітектура
- Файли `.BIN` обробляються через pymavlink
- Трансформація координат WGS-84 в ENU
- Sensor fusion з GPS корекцією
- Візуалізація 3D траєкторії в реальному часі
