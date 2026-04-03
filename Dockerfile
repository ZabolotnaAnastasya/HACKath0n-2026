# Використовуємо легку версію Python
FROM python:3.10-slim

# Робоча директорія в контейнері
WORKDIR /app

# Встановлюємо системні залежності (потрібно для scipy та pandas)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо список бібліотек і встановлюємо їх
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо весь код проєкту
COPY . .

# Відкриваємо порт для FastAPI
EXPOSE 8000

# Команда запуску сервера
CMD ["python", "src/api.py"]