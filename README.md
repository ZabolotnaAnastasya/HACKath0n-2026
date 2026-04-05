# Drone Telemetry Analysis & 3D Visualization System

## Problem Statement

Автоматизація аналізу 'чорних скриньок' БПЛА Ardupilot з візуалізацією 3D-траєкторії та розрахунком кінематичних метрик польоту.

## Workflow

Від завантаження сирого .BIN файлу до отримання інтерактивної 3D-моделі з розрахованими метриками. Система парсить MAVLink логи, виконує Sensor Fusion GPS/IMU даних, оптимізує траєкторію кубічними сплайнами та візуалізує результат у веб-інтерфейсі.

## Stack

Python (FastAPI, NumPy, SciPy) для математичних обчислень та обробки даних. React (Three.js) для 3D-візуалізації та інтерактивного інтерфейсу. Docker для контейнеризації та розгортання. Стек обрано як оптимальний для швидкого прототипування MVP з високою математичною точністю.

## Installation & Deployment

```bash
docker compose up --build
```

Доступність сервісів:
- API: http://localhost:8000 (Swagger UI: /docs)
- Web UI: http://localhost:3000

## Reference

Детальна архітектура, математичні алгоритми та обґрунтування — у docs/ARCHITECTURE.md.
