# ─── Stage 1: Build frontend ─────────────────────────────────────────────
FROM node:22-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js index.html ./
COPY src/ src/
COPY public/ public/
COPY template/ template/
RUN npx vite build

# ─── Stage 2: Backend + static serving ───────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY app/ app/
COPY --from=frontend /build/dist/ dist/

EXPOSE 4561

VOLUME /app/data

CMD ["python3", "server.py", "4561"]
