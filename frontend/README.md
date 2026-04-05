# Drone Telemetry Frontend

3D-візуалізація траєкторії БПЛА з інтерактивним інтерфейсом.

## Архітектура

React + TypeScript + Vite для швидкої розробки. Three.js для WebGL рендерингу 3D-сцен. Zustand для управління станом. React-Leaflet для 2D-карт.

## Компоненти

- **TrajectoryScene**: 3D-сцена з траєкторією через Three.js
- **MapView**: 2D-карта з маршрутом через Leaflet
- **FileUpload**: Завантаження .BIN файлів з drag-and-drop
- **InfoPanel**: Відображення метрик польоту

## Стан

Zustand stores для управління траєкторією, камерою, завантаженням файлів.

## Розробка

```bash
npm run dev
```

## Збірка

```bash
npm run build
```
