FROM python:3.11-slim

WORKDIR /app

# Instalar TODAS las dependencias de sistema en una sola capa:
# - gcc, libpq-dev: compilación de psycopg2
# - curl, wget, gnupg: herramientas de red
# - libnss3..libgbm1: dependencias de Chromium/Playwright (NO usar playwright install-deps
#   porque necesita apt lists que ya se borraron; las instalamos explícitamente)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl wget gnupg \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2 libx11-xcb1 \
    libxcb1 libxext6 libxshmfence1 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar solo el binario de Chromium (las deps de SO ya están arriba)
RUN playwright install chromium \
    && echo "✅ Chromium instalado en:" \
    && find /root/.cache -name "chrome" -type f 2>/dev/null | head -1

COPY . .

EXPOSE 3050

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3050"]
