FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONPATH="/app/src"
ENV GEMINI_API_KEY="AIzaSyDq5WUkWgowk4V43_DWATj1Fyvqs7VCt_U"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]