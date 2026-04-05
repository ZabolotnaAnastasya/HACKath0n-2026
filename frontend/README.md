# 3D Візуалізатор Траєкторії Дронів

React + TypeScript + Three.js фронтенд для візуалізації телеметрії польотів дронів у реальному часі.

## Технологічний Стек
- **React 18** з TypeScript для строгої типізації
- **Three.js** для WebGL 3D рендерингу
- **Vite** для швидкої розробки та збірки
- **TailwindCSS** для стилізації
- **Zustand** для управління станом

## Архітектура Компонентів

### Основні Компоненти
- **TrajectoryScene**: 3D сцена з траєкторією та інтерактивними точками
- **FileUpload**: Завантаження та обробка файлів логів
- **InfoPanel**: Детальна інформація про точку траєкторії
- **MapController**: Управління камерою та навігація

### Стори (Zustand)
- **useTrajectoryStore**: Управління даними траєкторії
- **useFileLoadStore**: Стан завантаження файлів
- **useMaxPointsStore**: Налаштування оптимізації точок

## Математична Основа

### 3D Трансформації
```typescript
// Трансформація WGS-84 в ENU координати
const enu = transformWGS84ToENU(lat, lng, alt, origin);

// Масштабування траєкторії для візуалізації
const scaled = scaleTrajectory(trajectory, bounds);
```

### Інтерполяція та Згладжування
```typescript
// Кубічні сплайни для гладких кривих
const spline = new CubicSpline(points, tension);

// Динамічне кольорування залежно від швидкості
const color = interpolateColor(speed, minSpeed, maxSpeed);
```

### Обробка Орієнтації
```typescript
// Кватерніони для обертання 3D об'єктів
const quaternion = new THREE.Quaternion();
quaternion.setFromEuler(euler);

// Матриці трансформації для позиціонування
const matrix = new THREE.Matrix4();
matrix.compose(position, quaternion, scale);
```

## Запуск Розробки

```bash
# Встановлення залежностей
npm install

# Запуск dev сервера
npm run dev

# Збірка для production
npm run build

# Попередній перегляд
npm run preview
```

## Порти та Сервіси
- **Dev Server**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **Production Build**: ./dist папка

## Конфігурація

### Vite (vite.config.ts)
- Налаштування Three.js для правильного імпорту
- Оптимізація для великих 3D моделей

### TailwindCSS (tailwind.config.cjs)
- Кастомні кольори для темної теми
- Анімації для інтерактивних елементів

## Оптимізація Продуктивності

### 3D Рендеринг
- **Instanced Rendering** для тисяч точок
- **LOD System** для динамічної деталізації
- **Frustum Culling** для відсічення невидимих об'єктів

### Управління Станом
- **Memoization** для дорогих обчислень
- **Debouncing** для інтерактивних елементів
- **Lazy Loading** для великих компонентів

## Структура Проекту
```
src/
├── components/     # React компоненти
├── hooks/         # Кастомні хуки
├── stores/        # Zustand стори
├── helpers/       # Утиліти та мат. функції
├── types/         # TypeScript інтерфейси
└── pages/         # Сторінки додатку
```
