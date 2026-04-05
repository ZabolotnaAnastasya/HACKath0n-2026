
import os
import json
import requests

# Налаштування API
# Ключ береться безпосередньо з системних змінних Docker (ENV)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

MODEL_NAME = "gemini-flash-latest"
API_VERSION = "v1beta"

# Формуємо URL для Google AI Studio
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/{API_VERSION}/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

# Розширений промпт з інженерними критеріями аналізу
PROMPT_TEMPLATE = """
Розраховані показники польоту:
{telemetry_json}

Ти — провідний експерт-аналітик телеметрії БПЛА. Твоя спеціалізація: глибокий технічний аудит логів польотних контролерів.
Твій стиль: професійний, аналітичний, аргументований.

КОНТЕКСТ АНАЛІЗУ (Критерії):
1. Вертикальна швидкість: підйом > 10 м/с або спуск > 8 м/с вважати агресивним маневром. Спуск > 15 м/с — ймовірне піке або втрата тяги.
2. Прискорення (G-force): Піки > 4-5G свідчать про різкі маневри; > 10G — жорстке приземлення або зіткнення.
3. Кореляція даних: Швидкість без зміни координат або висока швидкість при нульовому нахилі (pitch) вказує на похибку GPS/IMU.
4. Батарея: падіння напруги нижче 3.3V на банку — критичний розряд.

ТВОЯ ЗАДАЧА:
- Проаналізуй вхідні дані. Самостійно вияви фізичні аномалії та ПРЕЗЕНТУЙ їх як розгорнутий технічний звіт.
- Якщо дані суперечливі (наприклад, GPS показує рух, а IMU — спокій), розпиши, чому саме ти вважаєш ці дані недостовірними.
- Пояснюй кожен свій висновок, спираючись на фізику польоту.

ПРАВИЛА ВІДПОВІДІ:
- ПИШИ ТІЛЬКИ ЧИСТИЙ ТЕКСТ. НЕ використовуй Markdown (жодних #, *, -, [], заголовків).
- Розділяй блоки двома порожніми рядками для читабельності.

СТРУКТУРА ВІДПОВІДІ:
ГОЛОВНИЙ ВИСНОВОК: (Детальний опис статусу польоту та загальна оцінка надійності даних)

КРИТИЧНІ АНОМАЛІЇ: (Розгорнутий перелік знайдених проблем із зазначенням конкретних цифр та їхніх фізичних наслідків для БПЛА. Якщо проблем немає — пиши про стабільність показників)

ДЕТАЛЬНИЙ ТЕХНІЧНИЙ РОЗБІР: (Детальний аналіз взаємозв'язку швидкості, прискорення, висоти та дистанції. Поясни аномалії, якщо вони є, або підтвердь логічність польоту цифрами)
"""

def get_ai_analysis(telemetry_data: dict) -> str:
    """
    Викликає Google Gemini API для швидкого інженерного аналізу телеметрії.
    Повертає чистий текст (Raw Text) без Markdown-розмітки.
    """
    if not GEMINI_API_KEY:
        return "Помилка: GEMINI_API_KEY не знайдено в системних змінних."

    headers = {
        "Content-Type": "application/json"
    }

    # Підготовка тексту запиту
    prompt_text = PROMPT_TEMPLATE.format(
        telemetry_json=json.dumps(telemetry_data, indent=2, ensure_ascii=False)
    )

    # Конфігурація для Raw Text відповіді
    body = {
        "contents": [
            {
                "parts": [{"text": prompt_text}]
            }
        ],
        "generationConfig": {
                    "temperature": 0.4,
                    "responseMimeType": "text/plain"
                }
    }

    try:
        response = requests.post(GEMINI_API_URL, headers=headers, json=body)

        if response.status_code == 429:
            return "Помилка: Перевищено ліміт запитів (429). Спробуйте через 60 секунд."
        
        if response.status_code != 200:
            # Логування детальної помилки для розробника
            print(f"DEBUG ERROR: {response.status_code} - {response.text}")
            response.raise_for_status()

        result = response.json()

        # Безпечне вилучення тексту з відповіді Gemini
        if "candidates" in result and len(result["candidates"]) > 0:
            content = result["candidates"][0].get("content", {})
            parts = content.get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()

        return "Помилка: API повернуло порожню відповідь."

    except requests.exceptions.RequestException as e:
        # Логування помилок мережі
        print(f"Критична помилка зв'язку з AI: {e}")
        return "Помилка підключення до сервера аналітики ШІ."