// Базовий URL сервісу Open-Meteo та локального сервера
const BASE_API_URL = 'https://api.open-meteo.com/v1/forecast';
const LOCAL_API_URL = '/api/cities';

// Функція санітизації/екранування спеціальних символів HTML для захисту від XSS (Lab 15)
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str ?? '').replace(/[&<>"']/g, ch => map[ch]);
}

// Резервні дані на випадок недоступності мережі
const fallbackCities = [
  { id: 'kyiv', name: 'Київ', lat: 50.45, lon: 30.52, temperature: 21, weatherCode: 0, time: '2026-10-01T12:00' },
  { id: 'lviv', name: 'Львів', lat: 49.84, lon: 24.03, temperature: 18, weatherCode: 2, time: '2026-10-01T12:00' },
  { id: 'odesa', name: 'Одеса', lat: 46.48, lon: 30.73, temperature: 23, weatherCode: 1, time: '2026-10-01T12:00' }
];

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
  61: { desc: 'Слабкий дощ', icon: '🌧️️' },
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
  95: { desc: 'Гроза', icon: '⛈️' },
  96: { desc: 'Гроза з невеликим градом', icon: '⛈️' },
  99: { desc: 'Гроза з сильним градом', icon: '⛈️' }
};

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
// IndexedDB та сховище даних
// ========================================================

const DB_NAME = 'WeatherDB';
const DB_VERSION = 1;
const STORE_NAME = 'cities';

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

async function getCityById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
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

async function fetchCitiesFromLocalServer() {
  try {
    const response = await fetch(LOCAL_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP статус: ${response.status}`);
    }
    const serverCities = await response.json();
    return serverCities.map(c => ({
      ...c,
      temperature: null,
      weatherCode: null,
      time: null
    }));
  } catch (error) {
    console.warn('Локальний API недоступний, використовуємо резервні дані:', error);
    return fallbackCities;
  }
}

async function initStorage() {
  const isMigrated = localStorage.getItem('cities_migrated_v14');
  if (isMigrated) return;

  const dbCities = await getAllCities();
  if (dbCities.length === 0) {
    const citiesToSave = await fetchCitiesFromLocalServer();
    for (const city of citiesToSave) {
      await saveCity(city);
    }
  }
  localStorage.setItem('cities_migrated_v14', 'true');
}

// ========================================================
// Canvas API: Анімована іконка погоди
// ========================================================

let animationFrameId = null;
let isAnimationRunning = true;
let currentWeatherCode = 0;
let sunAngle = 0;
let cloudFloatOffset = 0;
let cloudFloatDirection = 1;

const rainDrops = Array.from({ length: 18 }, () => ({
  x: Math.random() * 60 + 10,
  y: Math.random() * 40 + 35,
  length: Math.random() * 6 + 6,
  speed: Math.random() * 2 + 2.5
}));

const snowFlakes = Array.from({ length: 15 }, () => ({
  x: Math.random() * 60 + 10,
  y: Math.random() * 40 + 35,
  radius: Math.random() * 1.5 + 1.2,
  speed: Math.random() * 0.8 + 0.6,
  drift: Math.random() * 0.4 - 0.2
}));

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

function renderCanvasFrame(ctx, canvas) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const code = currentWeatherCode;

  if (code === 0 || code === 1) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sunAngle);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
      ctx.lineTo(Math.cos(angle) * 31, Math.sin(angle) * 31);
      ctx.stroke();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    sunAngle += 0.015;
  } else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82) || code >= 95) {
    drawCloudShape(ctx, 18, 30, '#64748b');
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    rainDrops.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 1.5, drop.y + drop.length);
      ctx.stroke();
      drop.y += drop.speed;
      if (drop.y > canvas.height) drop.y = 35;
    });
  } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    drawCloudShape(ctx, 18, 30, '#94a3b8');
    ctx.fillStyle = '#e2e8f0';
    snowFlakes.forEach(flake => {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
      flake.y += flake.speed;
      if (flake.y > canvas.height) flake.y = 35;
    });
  } else {
    cloudFloatOffset += 0.03 * cloudFloatDirection;
    if (Math.abs(cloudFloatOffset) > 2) cloudFloatDirection *= -1;
    drawCloudShape(ctx, 16, 42 + cloudFloatOffset, '#94a3b8');
    drawCloudShape(ctx, 22, 38 + cloudFloatOffset, '#cbd5e1');
  }
}

function startWeatherAnimation(canvasId = '#weather-canvas') {
  stopWeatherAnimation();
  isAnimationRunning = true;

  function loop() {
    const canvas = document.querySelector(canvasId);
    if (!canvas) {
      stopWeatherAnimation();
      return;
    }
    const ctx = canvas.getContext('2d');
    renderCanvasFrame(ctx, canvas);
    animationFrameId = requestAnimationFrame(loop);
  }
  animationFrameId = requestAnimationFrame(loop);
}

function stopWeatherAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ========================================================
// Vue 3: WeatherCard компонент (безпечний завдяки шаблонізатору Vue)
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
    return { showFahrenheit: false };
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
    <article class="card" :class="{ cold: tempC < 0 }" @click="toggleFahrenheit" style="cursor: pointer;">
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

let defaultForecast = [
  { day: 'Пн', tempC: 19, description: 'Ясно', icon: '☀️' },
  { day: 'Вт', tempC: 18, description: 'Хмарно', icon: '⛅' },
  { day: 'Ср', tempC: 16, description: 'Дощ', icon: '🌧️' },
  { day: 'Чт', tempC: 20, description: 'Сонячно', icon: '🌤️' },
  { day: 'Пт', tempC: -2, description: 'Заморозки', icon: '❄️' },
  { day: 'Сб', tempC: 24, description: 'Тепло', icon: '🔥' },
  { day: 'Нд', tempC: -5, description: 'Сніг', icon: '🌨️' }
];

// ========================================================
// SPA Views (з обов'язковою санітизацією даних у innerHTML)
// ========================================================

const app = document.querySelector('#app');

async function renderHomeView() {
  const lastCityId = localStorage.getItem('last_selected_city') || 'kyiv';
  let targetCity = await getCityById(lastCityId);
  if (!targetCity) {
    targetCity = fallbackCities[0];
  }

  // Захищене вставлення targetCity.name через escapeHtml
  app.innerHTML = `
    <div class="top-row">
      <section id="current" class="current-weather">
        <div class="current-header">
          <h2>Поточна погода</h2>
          <div class="header-actions">
            <button type="button" id="toggle-anim-btn" class="btn btn--secondary">Пауза анімації</button>
            <button type="button" id="refresh-weather-btn" class="btn btn--secondary">Оновити</button>
          </div>
        </div>

        <p id="weather-error" class="weather-error" hidden></p>

        <article class="card card--current">
          <div class="card-header">
            <h3 id="current-city-name">${escapeHtml(targetCity.name)}</h3>
            <canvas id="weather-canvas" width="80" height="80" aria-label="Анімована іконка"></canvas>
          </div>
          <span class="temp temp--warm" id="current-temp">+--°C</span>
          <p class="desc" id="current-desc">Завантаження прогнозу...</p>
          <time class="weather-time" id="current-time"></time>
        </article>
      </section>

      <aside id="advice">
        <h2>Що вдягнути</h2>
        <p class="desc">Очікування погодних даних...</p>
      </aside>
    </div>

    <section id="forecast">
      <div class="section-header">
        <h2>Прогноз на 7 днів</h2>
        <div class="forecast-controls">
          <p id="avg-temp" class="avg-temp">Середня температура: {{ avgTempFormatted }}</p>
          <button type="button" id="warmest-btn" class="btn btn--secondary" @click="showWarmest">Найтепліший день</button>
        </div>
      </div>

      <p id="warmest-result" class="warmest-result" aria-live="polite">{{ warmestResult }}</p>
      
      <div class="cards">
        <weather-card
          v-for="item in forecastData"
          :key="item.day"
          :day="item.day"
          :temp-c="item.tempC"
          :description="item.description"
          :icon="item.icon"
        ></weather-card>
      </div>
    </section>

    <section id="add-forecast" class="form-section">
      <h2>Додати день до прогнозу</h2>
      <form id="weather-form" class="weather-form" novalidate>
        <div class="form-group">
          <label for="day-input">День тижня</label>
          <input type="text" id="day-input" name="day" placeholder="Наприклад, Пн" required>
        </div>

        <div class="form-group">
          <label for="temp-input">Температура (°C)</label>
          <input type="number" id="temp-input" name="tempC" placeholder="-50 до 50" min="-50" max="50" required>
        </div>

        <div class="form-group">
          <label for="desc-input">Опис погоди</label>
          <input type="text" id="desc-input" name="description" placeholder="Сонячно, Дощ тощо">
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn--primary">Додати до прогнозу</button>
        </div>
      </form>
    </section>
  `;

  startWeatherAnimation('#weather-canvas');

  const toggleAnimBtn = document.querySelector('#toggle-anim-btn');
  toggleAnimBtn.addEventListener('click', () => {
    if (animationFrameId) {
      stopWeatherAnimation();
      toggleAnimBtn.textContent = 'Старт анімації';
    } else {
      startWeatherAnimation('#weather-canvas');
      toggleAnimBtn.textContent = 'Пауза анімації';
    }
  });

  async function fetchCurrentData() {
    const refreshBtn = document.querySelector('#refresh-weather-btn');
    const errBox = document.querySelector('#weather-error');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Оновлення...';
    }
    if (errBox) errBox.hidden = true;

    try {
      const url = `${BASE_API_URL}?latitude=${targetCity.lat}&longitude=${targetCity.lon}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP помилка: ${res.status}`);
      const data = await res.json();

      currentWeatherCode = data.current.weather_code;
      const codeInfo = WEATHER_CODES[currentWeatherCode] || { desc: 'Невідомо', icon: '🌤️' };
      const tempVal = Math.round(data.current.temperature_2m);
      const sign = tempVal > 0 ? '+' : '';

      const tempEl = document.querySelector('#current-temp');
      const descEl = document.querySelector('#current-desc');
      const timeEl = document.querySelector('#current-time');
      const advEl = document.querySelector('#advice .desc');

      // Безпечне оновлення текстових вузлів через textContent
      if (tempEl) {
        tempEl.textContent = `${sign}${tempVal}°C`;
        tempEl.className = `temp ${tempVal >= 19 ? 'temp--warm' : 'temp--cool'}`;
      }
      if (descEl) descEl.textContent = codeInfo.desc;
      if (timeEl) timeEl.textContent = `Оновлено: ${new Date(data.current.time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
      if (advEl) {
        advEl.textContent = tempVal >= 20
          ? `Сьогодні ${codeInfo.desc.toLowerCase()} та тепло (${sign}${tempVal}°C). Легкий одяг, пляшка води.`
          : `Сьогодні ${codeInfo.desc.toLowerCase()} (${sign}${tempVal}°C). Демісезонний одяг.`;
      }

      await saveCity({
        ...targetCity,
        temperature: tempVal,
        weatherCode: currentWeatherCode,
        time: data.current.time
      });
    } catch (err) {
      console.error(err);
      if (errBox) {
        errBox.textContent = 'Не вдалося отримати прогноз погоди';
        errBox.hidden = false;
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Оновити';
      }
    }
  }

  const refreshBtn = document.querySelector('#refresh-weather-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchCurrentData);
  fetchCurrentData();

  const forecastApp = Vue.createApp({
    components: { WeatherCard },
    data() {
      return {
        forecastData: defaultForecast,
        warmestResult: ''
      };
    },
    computed: {
      avgTempFormatted() {
        if (!this.forecastData.length) return '0°C';
        const total = this.forecastData.reduce((sum, item) => sum + item.tempC, 0);
        const avg = (total / this.forecastData.length).toFixed(1);
        return `${Number(avg) > 0 ? '+' : ''}${avg}°C`;
      }
    },
    methods: {
      showWarmest() {
        const warmest = this.forecastData.reduce((prev, cur) => cur.tempC > prev.tempC ? cur : prev);
        this.warmestResult = `Найтепліший день: ${warmest.day} (${warmest.tempC > 0 ? '+' : ''}${warmest.tempC}°C, ${warmest.description})`;
      }
    }
  }).mount('#forecast');

  const form = document.querySelector('#weather-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const day = document.querySelector('#day-input').value.trim();
    const tempC = Number(document.querySelector('#temp-input').value);
    const description = document.querySelector('#desc-input').value.trim() || 'Ясно';
    if (!day) return;

    forecastApp.forecastData.push({
      day,
      tempC,
      description,
      icon: resolveWeatherIcon(description, tempC)
    });
    form.reset();
  });
}

// Маршрут «/cities» — захищене формування карток (Крок 3, 5)
async function renderCitiesView() {
  stopWeatherAnimation();
  const cities = await getAllCities();

  app.innerHTML = `
    <section class="saved-cities-section">
      <div class="section-header">
        <h2>Збережені міста</h2>
      </div>

      <div id="cities-container" class="cards">
        ${cities.map(city => {
          const codeInfo = WEATHER_CODES[city.weatherCode] || { desc: 'Невідомо', icon: '🌤️' };
          const tempText = city.temperature !== null ? `${city.temperature > 0 ? '+' : ''}${city.temperature}°C` : '...';
          const safeId = encodeURIComponent(city.id);

          return `
            <article class="card card--city" data-id="${safeId}">
              <div class="card-header">
                <h3>${escapeHtml(city.name)}</h3>
                <span class="weather-icon">${codeInfo.icon}</span>
              </div>
              <p class="city-coords">${Number(city.lat).toFixed(2)}°,${Number(city.lon).toFixed(2)}°</p>
              <span class="temp ${city.temperature >= 19 ? 'temp--warm' : 'temp--cool'}">${tempText}</span>
              <p class="desc">${codeInfo.desc}</p>
              <div class="city-card-actions">
                <a href="#/cities/${safeId}" data-link class="btn btn--secondary">Детальніше</a>
                <button type="button" class="btn btn--danger delete-city-btn" data-id="${safeId}">Видалити</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <div class="form-section" style="margin-top: 24px;">
        <h3>Додати місто до списку</h3>
        <form id="city-form" class="weather-form" novalidate>
          <div class="form-group">
            <label for="city-name-input">Назва міста</label>
            <input type="text" id="city-name-input" required placeholder="Наприклад, Вінниця">
          </div>
          <div class="form-group">
            <label for="city-lat-input">Широта (Latitude)</label>
            <input type="number" id="city-lat-input" step="0.0001" min="-90" max="90" required placeholder="49.2331">
          </div>
          <div class="form-group">
            <label for="city-lon-input">Довгота (Longitude)</label>
            <input type="number" id="city-lon-input" step="0.0001" min="-180" max="180" required placeholder="28.4682">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn--primary">Зберегти місто</button>
          </div>
        </form>
      </div>
    </section>
  `;

  document.querySelectorAll('.delete-city-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteCity(btn.dataset.id);
      renderCitiesView();
    });
  });

  const cityForm = document.querySelector('#city-form');
  cityForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.querySelector('#city-name-input').value.trim();
    const lat = Number(document.querySelector('#city-lat-input').value);
    const lon = Number(document.querySelector('#city-lon-input').value);
    if (!name || isNaN(lat) || isNaN(lon)) return;

    // Створюємо валідний ідентифікатор без небезпечних символів
    const id = name.toLowerCase().replace(/[^a-z0-9а-яіїєґ]/gi, '-');
    await saveCity({ id, name, lat, lon, temperature: null, weatherCode: null, time: null });
    renderCitiesView();
  });
}

// Маршрут «/cities/:id» — захищене формування сторінки деталей
async function renderCityDetailView(params) {
  stopWeatherAnimation();
  const city = await getCityById(params.id);

  if (!city) {
    app.innerHTML = `
      <section class="not-found-section">
        <h2>Місто не знайдено</h2>
        <p class="desc">Місто з ідентифікатором «${escapeHtml(params.id)}» відсутнє в базі даних.</p>
        <a href="#/cities" data-link class="btn btn--primary">До списку міст</a>
      </section>
    `;
    return;
  }

  localStorage.setItem('last_selected_city', city.id);

  app.innerHTML = `
    <section class="city-detail-section">
      <article class="card card--detail">
        <div class="card-header">
          <h2>${escapeHtml(city.name)}</h2>
          <canvas id="detail-weather-canvas" width="80" height="80"></canvas>
        </div>
        <p class="city-coords">Координати: ${Number(city.lat).toFixed(4)}° пн. ш., ${Number(city.lon).toFixed(4)}° сх. д.</p>
        <span class="temp temp--warm" id="detail-temp">Завантаження...</span>
        <p class="desc" id="detail-desc">Отримання свіжих метеоданих...</p>
        <time class="weather-time" id="detail-time"></time>

        <div class="detail-actions">
          <a href="#/" data-link class="btn btn--primary">Зробити головним</a>
          <a href="#/cities" data-link class="btn btn--secondary">← До списку міст</a>
        </div>
      </article>
    </section>
  `;

  startWeatherAnimation('#detail-weather-canvas');

  try {
    const url = `${BASE_API_URL}?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Помилка сервера погоди');
    const data = await res.json();

    currentWeatherCode = data.current.weather_code;
    const codeInfo = WEATHER_CODES[currentWeatherCode] || { desc: 'Невідомо', icon: '🌤️' };
    const tempVal = Math.round(data.current.temperature_2m);
    const sign = tempVal > 0 ? '+' : '';

    const tempEl = document.querySelector('#detail-temp');
    const descEl = document.querySelector('#detail-desc');
    const timeEl = document.querySelector('#detail-time');

    if (tempEl) {
      tempEl.textContent = `${sign}${tempVal}°C`;
      tempEl.className = `temp ${tempVal >= 19 ? 'temp--warm' : 'temp--cool'}`;
    }
    if (descEl) descEl.textContent = codeInfo.desc;
    if (timeEl) timeEl.textContent = `Оновлено: ${new Date(data.current.time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;

    await saveCity({
      ...city,
      temperature: tempVal,
      weatherCode: currentWeatherCode,
      time: data.current.time
    });
  } catch (err) {
    console.error(err);
    const descEl = document.querySelector('#detail-desc');
    if (descEl) descEl.textContent = 'Не вдалося оновити дані погоди з мережі';
  }
}

function renderNotFoundView() {
  stopWeatherAnimation();
  app.innerHTML = `
    <section class="not-found-section">
      <h2>404 — Сторінку не знайдено</h2>
      <p class="desc">Маршрут не існує в дашборді.</p>
      <a href="#/" data-link class="btn btn--primary">Повернутися на головну</a>
    </section>
  `;
}

const routes = [
  { path: '/', view: renderHomeView },
  { path: '/cities', view: renderCitiesView },
  { path: '/cities/:id', view: renderCityDetailView }
];

function matchRoute(path) {
  const pathParts = path.split('/').filter(Boolean);

  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;

    const params = {};
    const isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[i];
        return true;
      }
      return part === pathParts[i];
    });

    if (isMatch) return { view: route.view, params };
  }

  return null;
}

function navigate(path) {
  location.hash = path;
}

async function router() {
  const hash = location.hash.slice(1);
  const path = hash || '/';

  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href');
    const routeTarget = href.startsWith('#') ? href.slice(1) : href;
    a.classList.toggle('active', routeTarget === path);
  });

  const match = matchRoute(path);

  if (match) {
    await match.view(match.params);
  } else {
    renderNotFoundView();
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-link]');
  if (!link) return;

  event.preventDefault();
  const href = link.getAttribute('href');
  const targetPath = href.startsWith('#') ? href.slice(1) : href;
  navigate(targetPath);
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  await initStorage();
  router();
});