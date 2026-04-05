import requests

N8N_WEBHOOK_URL = "http://n8n:5678/webhook-test/analyze-telemetry"

def get_ai_analysis(telemetry_data: dict) -> str:
    """
    Відправляє прораховані дані телеметрії в n8n для загального аналізу.
    """
    payload = {
        "telemetry_data": telemetry_data
    }
    
    try:
        response = requests.post(N8N_WEBHOOK_URL, json=payload)
        response.raise_for_status() 
        return response.text 
    
    except requests.exceptions.RequestException as e:
        print(f"Помилка зв'язку з n8n: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"ДЕТАЛІ ВІД N8N: {e.response.text}")
        return "Вибачте, сталася помилка при генерації звіту ШІ."