// Базовий URL сервісу Open-Meteo
const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m,weather_code&timezone=auto';

// Словник інтерпретації кодів WMO
const WEATHER_CODES = {
  0: { desc: 'Ясно', icon: '☀️' },
  1: { desc: 'Переважно ясно', icon: '🌤️' },
  2: { desc: 'Мінлива хмарність', icon: '⛅' },
  3: { desc: 'Похмуро', icon: '☁️' },
  45: { desc: 'Туман', icon: '🌫️' },
  48: { desc: 'Паморозь із туманом', icon: '🌫️' },
  51: { desc: 'Легка мряка', icon: '🌦️' },
  53: { desc: 'Помірна мряка', icon: '🌦️' },
  55: { desc: 'Густа мряка', icon: '🌧️' },
  61: { desc: 'Слабкий дощ', icon: '🌧️' },
  63: { desc: 'Помірний дощ', icon: '🌧️' },
  65: { desc: 'Сильний дощ', icon: '🌧️' },
  71: { desc: 'Слабкий снігопад', icon: '🌨️' },
  73: { desc: 'Помірний снігопад', icon: '🌨️' },
  75: { desc: 'Сильний снігопад', icon: '❄️' },
  77: { desc: 'Снігові зерна', icon: '❄️' },
  80: { desc: 'Короткочасний дощ', icon: '🌦️' },
  81: { desc: 'Злива', icon: '🌧️' },
  82: { desc: 'Сильна злива', icon: '⛈️' },
  85: { desc: 'Снігопад із проясненнями', icon: '🌨️' },
  86: { desc: 'Сильний хуртовинний сніг', icon: '❄️' },
  95: { desc: 'Гроза', icon: '⛈️️' },
  96: { desc: 'Гроза з невеликим градом', icon: '⛈️' },
  99: { desc: 'Гроза з сильним градом', icon: '⛈️' }
};

// Елементи блоку поточної погоди
const refreshWeatherBtn = document.querySelector('#refresh-weather-btn');
const toggleAnimBtn = document.querySelector('#toggle-anim-btn');
const weatherError = document.querySelector('#weather-error');
const currentTemp = document.querySelector('#current-temp');
const currentDesc = document.querySelector('#current-desc');
const currentIcon = document.querySelector('#current-icon');
const currentTime = document.querySelector('#current-time');
const adviceDesc = document.querySelector('#advice .desc');

// ========================================================
// Canvas API: Анімована іконка погоди
// ========================================================

const canvas = document.querySelector('#weather-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let animationFrameId = null;
let isAnimationRunning = true;
let currentWeatherCode = 0;

let sunAngle = 0;
let cloudFloatOffset = 0;
let cloudFloatDirection = 1;

// Генерація крапель дощу для анімації опадів
const rainDrops = Array.from({ length: 18 }, () => ({
  x: Math.random() * 60 + 10,
  y: Math.random() * 40 + 35,
  length: Math.random() * 6 + 6,
  speed: Math.random() * 2 + 2.5
}));

// Генерація сніжинок для анімації зимової погоди
const snowFlakes = Array.from({ length: 15 }, () => ({
  x: Math.random() * 60 + 10,
  y: Math.random() * 40 + 35,
  radius: Math.random() * 1.5 + 1.2,
  speed: Math.random() * 0.8 + 0.6,
  drift: Math.random() * 0.4 - 0.2
}));

// Малювання форми хмари
function drawCloudShape(context, x, y, fillColor = '#94a3b8') {
  context.fillStyle = fillColor;
  context.beginPath();
  context.arc(x, y, 14, Math.PI * 0.5, Math.PI * 1.5);
  context.arc(x + 14, y - 10, 16, Math.PI * 1, Math.PI * 1.9);
  context.arc(x + 32, y - 6, 13, Math.PI * 1.2, Math.PI * 2.1);
  context.arc(x + 40, y, 12, Math.PI * 1.5, Math.PI * 0.5);
  context.closePath();
  context.fill();
}

// Рендеринг сонячної погоди (обертання сонця з променями)
function renderSunAnimation() {
  if (!ctx) return;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(sunAngle);

  // Промені сонця
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const numRays = 8;
  for (let i = 0; i < numRays; i++) {
    const angle = (i * Math.PI * 2) / numRays;
    const x1 = Math.cos(angle) * 22;
    const y1 = Math.sin(angle) * 22;
    const x2 = Math.cos(angle) * 31;
    const y2 = Math.sin(angle) * 31;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Центральне коло сонця
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  sunAngle += 0.015;
}

// Рендеринг похмурої погоди / туману
function renderCloudAnimation() {
  if (!ctx) return;
  cloudFloatOffset += 0.03 * cloudFloatDirection;
  if (Math.abs(cloudFloatOffset) > 2) {
    cloudFloatDirection *= -1;
  }

  drawCloudShape(ctx, 16, 42 + cloudFloatOffset, '#94a3b8');
  drawCloudShape(ctx, 22, 38 + cloudFloatOffset, '#cbd5e1');
}

// Рендеринг дощу
function renderRainAnimation() {
  if (!ctx) return;
  drawCloudShape(ctx, 18, 30, '#64748b');

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  rainDrops.forEach(drop => {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 1.5, drop.y + drop.length);
    ctx.stroke();

    drop.y += drop.speed;
    drop.x -= 0.3;

    if (drop.y > canvas.height) {
      drop.y = 35;
      drop.x = Math.random() * 55 + 12;
    }
  });
}

// Рендеринг снігу
function renderSnowAnimation() {
  if (!ctx) return;
  drawCloudShape(ctx, 18, 30, '#94a3b8');

  ctx.fillStyle = '#e2e8f0';

  snowFlakes.forEach(flake => {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
    ctx.fill();

    flake.y += flake.speed;
    flake.x += flake.drift;

    if (flake.y > canvas.height) {
      flake.y = 35;
      flake.x = Math.random() * 55 + 12;
    }
  });
}

// Головний кадр анімаційного циклу requestAnimationFrame
function animateWeatherIcon() {
  if (!ctx || !isAnimationRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const code = currentWeatherCode;

  // Вибір анімації на основі WMO коду
  if (code === 0 || code === 1) {
    renderSunAnimation();
  } else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82) || code >= 95) {
    renderRainAnimation();
  } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    renderSnowAnimation();
  } else {
    renderCloudAnimation();
  }

  animationFrameId = requestAnimationFrame(animateWeatherIcon);
}

// Керування стартом/зупинкою анімації
function startWeatherAnimation() {
  if (!isAnimationRunning) {
    isAnimationRunning = true;
    if (toggleAnimBtn) toggleAnimBtn.textContent = 'Пауза анімації';
    animateWeatherIcon();
  }
}

function stopWeatherAnimation() {
  isAnimationRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (toggleAnimBtn) toggleAnimBtn.textContent = 'Старт анімації';
}

if (toggleAnimBtn) {
  toggleAnimBtn.addEventListener('click', () => {
    if (isAnimationRunning) {
      stopWeatherAnimation();
    } else {
      startWeatherAnimation();
    }
  });
}

// ========================================================
// Поточна погода та обробка API
// ========================================================

function showLoading(isLoading) {
  if (!refreshWeatherBtn) return;
  if (isLoading) {
    refreshWeatherBtn.disabled = true;
    refreshWeatherBtn.textContent = 'Оновлення...';
  } else {
    refreshWeatherBtn.disabled = false;
    refreshWeatherBtn.textContent = 'Оновити';
  }
}

function showError(message) {
  if (!weatherError) return;
  if (message) {
    weatherError.textContent = message;
    weatherError.hidden = false;
  } else {
    weatherError.textContent = '';
    weatherError.hidden = true;
  }
}

function renderCurrentWeather(current) {
  const codeInfo = WEATHER_CODES[current.weather_code] || { desc: 'Невідомо', icon: '🌤️' };
  const tempVal = Math.round(current.temperature_2m);
  const sign = tempVal > 0 ? '+' : '';

  // Оновлюємо код погоди для динамічної Canvas-анімації
  currentWeatherCode = current.weather_code;

  if (currentTemp) {
    currentTemp.textContent = `${sign}${tempVal}°C`;
    currentTemp.className = `temp ${tempVal >= 19 ? 'temp--warm' : 'temp--cool'}`;
  }

  if (currentDesc) {
    currentDesc.textContent = codeInfo.desc;
  }

  if (currentIcon) {
    currentIcon.textContent = codeInfo.icon;
  }

  if (currentTime && current.time) {
    const date = new Date(current.time);
    const timeFormatted = isNaN(date.getTime())
      ? current.time
      : date.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
    currentTime.textContent = `Оновлено: ${timeFormatted}`;
  }

  if (adviceDesc) {
    if (tempVal >= 20) {
      adviceDesc.textContent = `Сьогодні ${codeInfo.desc.toLowerCase()} та тепло (${sign}${tempVal}°C). Одягайте легкий одяг, сонцезахисні окуляри та не забудьте пляшку води.`;
    } else if (tempVal <= 5) {
      adviceDesc.textContent = `Сьогодні ${codeInfo.desc.toLowerCase()} та холодно (${sign}${tempVal}°C). Одягайте теплу куртку, шапку та рукавички.`;
    } else {
      adviceDesc.textContent = `Сьогодні ${codeInfo.desc.toLowerCase()} (${sign}${tempVal}°C). Погода помірна, підійде демісезонний одяг.`;
    }
  }
}

async function loadCurrentWeather() {
  showLoading(true);
  showError(null);

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP помилка: ${response.status}`);
    }

    const data = await response.json();
    renderCurrentWeather(data.current);
  } catch (error) {
    console.error('Помилка запиту:', error);
    showError('Не вдалося отримати прогноз погоди');
  } finally {
    showLoading(false);
  }
}

function resolveWeatherIcon(description, tempC) {
  const desc = (description || '').toLowerCase();
  if (desc.includes('дощ')) return '🌧️';
  if (desc.includes('сніг')) return '🌨️';
  if (desc.includes('замороз')) return '❄️';
  if (desc.includes('хмар')) return '⛅';
  if (tempC >= 24) return '🔥';
  if (tempC < 0) return '❄️';
  return '🌤️';
}

// ========================================================
// Vue 3: Компонент карток та реактивний прогноз
// ========================================================

const WeatherCard = {
  name: 'WeatherCard',
  props: {
    day: { type: String, required: true },
    tempC: { type: Number, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' }
  },
  data() {
    return {
      showFahrenheit: false
    };
  },
  computed: {
    tempF() {
      return Math.round((this.tempC * 9) / 5 + 32);
    },
    weatherIcon() {
      if (this.icon) return this.icon;
      return resolveWeatherIcon(this.description, this.tempC);
    }
  },
  methods: {
    toggleFahrenheit() {
      this.showFahrenheit = !this.showFahrenheit;
    }
  },
  template: `
    <article
      class="card"
      :class="{ cold: tempC < 0 }"
      :data-day="day"
      :data-temp="tempC"
      @click="toggleFahrenheit"
      style="cursor: pointer;"
    >
      <h3>{{ day }}</h3>
      <span class="weather-icon" aria-hidden="true">{{ weatherIcon }}</span>
      <span class="temp" :class="tempC >= 19 ? 'temp--warm' : 'temp--cool'">
        {{ tempC > 0 ? '+' : '' }}{{ tempC }}°C
        <span v-if="showFahrenheit" style="display: block; font-size: 0.6em; color: #64748b;">
          ({{ tempF > 0 ? '+' : '' }}{{ tempF }}°F)
        </span>
      </span>
      <p class="desc">{{ description || 'Без опадів' }}</p>
    </article>
  `
};

const forecastApp = Vue.createApp({
  components: {
    WeatherCard
  },
  data() {
    return {
      forecastData: [
        { day: 'Пн', tempC: 19, description: 'Ясно', icon: '☀️' },
        { day: 'Вт', tempC: 18, description: 'Хмарно', icon: '⛅' },
        { day: 'Ср', tempC: 16, description: 'Дощ', icon: '🌧️' },
        { day: 'Чт', tempC: 20, description: 'Сонячно', icon: '🌤️' },
        { day: 'Пт', tempC: -2, description: 'Заморозки', icon: '❄️' },
        { day: 'Сб', tempC: 24, description: 'Тепло', icon: '🔥' },
        { day: 'Нд', tempC: -5, description: 'Сніг', icon: '🌨️' }
      ],
      warmestResult: ''
    };
  },
  computed: {
    avgTempFormatted() {
      if (!this.forecastData || this.forecastData.length === 0) return 'обчислення...';
      const total = this.forecastData.reduce((sum, item) => sum + item.tempC, 0);
      const avg = (total / this.forecastData.length).toFixed(1);
      const sign = Number(avg) > 0 ? '+' : '';
      return `${sign}${avg}°C`;
    }
  },
  methods: {
    showWarmest() {
      if (!this.forecastData || this.forecastData.length === 0) {
        this.warmestResult = 'Дані прогнозу відсутні';
        return;
      }
      const warmest = this.forecastData.reduce((prev, current) => {
        return current.tempC > prev.tempC ? current : prev;
      });
      const sign = warmest.tempC > 0 ? '+' : '';
      this.warmestResult = `Найтепліший день: ${warmest.day} (${sign}${warmest.tempC}°C, ${warmest.description})`;
    }
  }
}).mount('#forecast');

// Форма додавання дня до прогнозу
const weatherForm = document.querySelector('#weather-form');
const dayInput = document.querySelector('#day-input');
const tempInput = document.querySelector('#temp-input');
const descInput = document.querySelector('#desc-input');

if (tempInput) {
  tempInput.addEventListener('input', () => {
    const val = tempInput.value.trim();
    if (val === '') {
      tempInput.setCustomValidity('');
      return;
    }
    const num = Number(val);
    if (num < -50 || num > 50) {
      tempInput.setCustomValidity('Температура поза реалістичним діапазоном (-50...50°C)');
    } else {
      tempInput.setCustomValidity('');
    }
  });
}

if (weatherForm) {
  weatherForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!weatherForm.checkValidity()) {
      weatherForm.reportValidity();
      return;
    }

    const dayValue = dayInput.value.trim();
    const tempValue = Number(tempInput.value);
    const descValue = descInput.value.trim() || 'Ясно';

    const newForecastItem = {
      day: dayValue,
      tempC: tempValue,
      description: descValue,
      icon: resolveWeatherIcon(descValue, tempValue)
    };

    forecastApp.forecastData.push(newForecastItem);
    weatherForm.reset();
    tempInput.setCustomValidity('');
  });
}

if (refreshWeatherBtn) {
  refreshWeatherBtn.addEventListener('click', loadCurrentWeather);
}

// ========================================================
// Локальні сховища: localStorage та IndexedDB
// ========================================================

const DB_NAME = 'WeatherDB';
const DB_VERSION = 1;
const STORE_NAME = 'cities';

const initialCities = [
  { id: 'kyiv', name: 'Київ', lat: 50.45, lon: 30.52, temperature: 21, weatherCode: 0, time: '2026-10-01T12:00' },
  { id: 'lviv', name: 'Львів', lat: 49.84, lon: 24.03, temperature: 18, weatherCode: 2, time: '2026-10-01T12:00' },
  { id: 'odesa', name: 'Одеса', lat: 46.48, lon: 30.73, temperature: 23, weatherCode: 1, time: '2026-10-01T12:00' }
];

const citiesContainer = document.querySelector('#cities-container');
const dbError = document.querySelector('#db-error');
const cityForm = document.querySelector('#city-form');
const cityNameInput = document.querySelector('#city-name-input');
const cityLatInput = document.querySelector('#city-lat-input');
const cityLonInput = document.querySelector('#city-lon-input');

function saveToLocalStorage(items) {
  localStorage.setItem('saved_cities', JSON.stringify(items));
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('saved_cities');
    return raw ? JSON.parse(raw) : initialCities;
  } catch (error) {
    console.error('Помилка читання localStorage:', error);
    return initialCities;
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB не підтримується браузером'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCity(city) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(city);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllCities() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteCity(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function migrateFromLocalStorage() {
  const isMigrated = localStorage.getItem('cities_migrated');
  if (isMigrated) return;

  const dbCities = await getAllCities();
  if (dbCities.length === 0) {
    const localData = loadFromLocalStorage();
    for (const city of localData) {
      await saveCity(city);
    }
  }
  localStorage.setItem('cities_migrated', 'true');
}

function renderCitiesList(cities) {
  if (!citiesContainer) return;
  citiesContainer.innerHTML = '';

  if (cities.length === 0) {
    citiesContainer.innerHTML = '<p class="desc">Список збережених міст порожній</p>';
    return;
  }

  cities.forEach(city => {
    const card = document.createElement('article');
    card.className = 'card card--city';
    card.setAttribute('data-id', city.id);

    const codeInfo = WEATHER_CODES[city.weatherCode] || { desc: 'Очікування...', icon: '🌤️' };
    const tempText = city.temperature !== null && city.temperature !== undefined
      ? `${city.temperature > 0 ? '+' : ''}${city.temperature}°C`
      : '...';

    const timeFormatted = city.time
      ? new Date(city.time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : 'не оновлено';

    card.innerHTML = `
      <div class="card-header">
        <h3>${city.name}</h3>
        <span class="weather-icon" aria-hidden="true">${codeInfo.icon}</span>
      </div>
      <p class="city-coords">${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°</p>
      <span class="temp ${city.temperature >= 19 ? 'temp--warm' : 'temp--cool'}">${tempText}</span>
      <p class="desc">${codeInfo.desc}</p>
      <time class="weather-time">Оновлено: ${timeFormatted}</time>
      <button type="button" class="btn btn--danger" data-id="${city.id}">Видалити</button>
    `;

    const delBtn = card.querySelector('button');
    delBtn.addEventListener('click', async () => {
      await deleteCity(city.id);
      const updatedList = await getAllCities();
      renderCitiesList(updatedList);
    });

    citiesContainer.appendChild(card);
  });
}

async function fetchWeatherForCity(city) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return city;
    const data = await res.json();

    const updated = {
      ...city,
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      time: data.current.time
    };

    await saveCity(updated);
    return updated;
  } catch (error) {
    console.warn(`Не вдалося отримати прогноз для ${city.name}:`, error);
    return city;
  }
}

async function refreshAllSavedCities() {
  const currentList = await getAllCities();
  for (const city of currentList) {
    await fetchWeatherForCity(city);
  }
  const freshList = await getAllCities();
  renderCitiesList(freshList);
}

if (cityForm) {
  cityForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!cityForm.checkValidity()) {
      cityForm.reportValidity();
      return;
    }

    const name = cityNameInput.value.trim();
    const lat = Number(cityLatInput.value);
    const lon = Number(cityLonInput.value);
    const id = name.toLowerCase().replace(/\s+/g, '-');

    const newCity = {
      id,
      name,
      lat,
      lon,
      temperature: null,
      weatherCode: null,
      time: null
    };

    await saveCity(newCity);
    cityForm.reset();

    const updatedList = await getAllCities();
    renderCitiesList(updatedList);

    await fetchWeatherForCity(newCity);
    const finalUpdated = await getAllCities();
    renderCitiesList(finalUpdated);
  });
}

async function initStorageAndCities() {
  try {
    if (!localStorage.getItem('saved_cities')) {
      saveToLocalStorage(initialCities);
    }

    await migrateFromLocalStorage();

    const cachedCities = await getAllCities();
    renderCitiesList(cachedCities);

    await refreshAllSavedCities();
  } catch (error) {
    console.error('Помилка ініціалізації бази даних:', error);
    if (dbError) {
      dbError.textContent = 'Локальне сховище IndexedDB недоступне (перевірте налаштування приватного перегляду).';
      dbError.hidden = false;
    }
  }
}

// Запуск анімації та завантаження застосунку
animateWeatherIcon();
loadCurrentWeather();
initStorageAndCities();