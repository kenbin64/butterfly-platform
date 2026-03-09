FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir butterflyfx-kernel || true
COPY . /app
EXPOSE 8081
CMD ["uvicorn", "butterflyfx_core.core_service.app:app", "--host", "0.0.0.0", "--port", "8081"]
