// Базовий URL сервісу Open-Meteo
const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&current=temperature_2m,weather_code&timezone=auto';

// Словник інтерпретації кодів WMO
const WEATHER_CODES = {
  0: { desc: 'Ясно', icon: '☀️' },
  1: { desc: 'Переважно ясно', icon: '🌤️️' },
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
  75: { desc: 'Сильний снігопад', icon: '❄️️' },
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

// Елементи блоку поточної погоди
const refreshWeatherBtn = document.querySelector('#refresh-weather-btn');
const weatherError = document.querySelector('#weather-error');
const currentTemp = document.querySelector('#current-temp');
const currentDesc = document.querySelector('#current-desc');
const currentIcon = document.querySelector('#current-icon');
const currentTime = document.querySelector('#current-time');
const adviceDesc = document.querySelector('#advice .desc');

// Керування станом завантаження
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

// Виведення повідомлення про помилку
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

// Відображення поточної погоди в картці
function renderCurrentWeather(current) {
  const codeInfo = WEATHER_CODES[current.weather_code] || { desc: 'Невідомо', icon: '🌤️' };
  const tempVal = Math.round(current.temperature_2m);
  const sign = tempVal > 0 ? '+' : '';

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

// Асинхронне отримання даних погоди для Києва
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

/**
 * Визначає емодзі-іконку відповідно до опису або температури
 */
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

// Компонент картки прогнозу погоди
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

// Ініціалізація додатку Vue для секції прогнозу
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

// DOM-елементи форми прогнозу
const weatherForm = document.querySelector('#weather-form');
const dayInput = document.querySelector('#day-input');
const tempInput = document.querySelector('#temp-input');
const descInput = document.querySelector('#desc-input');

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

if (refreshWeatherBtn) {
  refreshWeatherBtn.addEventListener('click', loadCurrentWeather);
}

// ========================================================
// Локальні сховища: localStorage та IndexedDB
// ========================================================

const DB_NAME = 'WeatherDB';
const DB_VERSION = 1;
const STORE_NAME = 'cities';

// Початкові дані міст для першого запису в localStorage
const initialCities = [
  { id: 'kyiv', name: 'Київ', lat: 50.45, lon: 30.52, temperature: 21, weatherCode: 0, time: '2026-10-01T12:00' },
  { id: 'lviv', name: 'Львів', lat: 49.84, lon: 24.03, temperature: 18, weatherCode: 2, time: '2026-10-01T12:00' },
  { id: 'odesa', name: 'Одеса', lat: 46.48, lon: 30.73, temperature: 23, weatherCode: 1, time: '2026-10-01T12:00' }
];

// Елементи секції збережених міст
const citiesContainer = document.querySelector('#cities-container');
const dbError = document.querySelector('#db-error');
const cityForm = document.querySelector('#city-form');
const cityNameInput = document.querySelector('#city-name-input');
const cityLatInput = document.querySelector('#city-lat-input');
const cityLonInput = document.querySelector('#city-lon-input');

// Синхронне збереження в localStorage
function saveToLocalStorage(items) {
  localStorage.setItem('saved_cities', JSON.stringify(items));
}

// Безпечне читання з localStorage
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('saved_cities');
    return raw ? JSON.parse(raw) : initialCities;
  } catch (error) {
    console.error('Помилка читання localStorage:', error);
    return initialCities;
  }
}

// Відкриття бази даних IndexedDB з Promise
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

// Додавання або оновлення міста через транзакцію put
async function saveCity(city) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(city);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Читання всіх міст зі сховища
async function getAllCities() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Видалення міста за id
async function deleteCity(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Одноразова міграція з localStorage в IndexedDB
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

// Рендер карток збережених міст
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

// Отримання свіжого прогнозу для кожного збереженого міста через API
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

// Оновлення погодних даних для всього списку збережених міст
async function refreshAllSavedCities() {
  const currentList = await getAllCities();
  for (const city of currentList) {
    await fetchWeatherForCity(city);
  }
  const freshList = await getAllCities();
  renderCitiesList(freshList);
}

// Додавання міста через форму
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

    // Фонове оновлення погоди для нового міста
    await fetchWeatherForCity(newCity);
    const finalUpdated = await getAllCities();
    renderCitiesList(finalUpdated);
  });
}

// Ініціалізація сховищ даних та завантаження
async function initStorageAndCities() {
  try {
    // 1. Початковий запис у localStorage (для перевірки Кроків 2-4)
    if (!localStorage.getItem('saved_cities')) {
      saveToLocalStorage(initialCities);
    }

    // 2. Одноразова міграція в IndexedDB (Крок 8)
    await migrateFromLocalStorage();

    // 3. Швидкий рендер збережених міст безпосередньо з IndexedDB (Крок 9)
    const cachedCities = await getAllCities();
    renderCitiesList(cachedCities);

    // 4. Отримання актуального прогнозу через API у фоні
    await refreshAllSavedCities();
  } catch (error) {
    console.error('Помилка ініціалізації бази даних:', error);
    if (dbError) {
      dbError.textContent = 'Локальне сховище IndexedDB недоступне (перевірте налаштування приватного перегляду).';
      dbError.hidden = false;
    }
  }
}

// Запуск застосунку
loadCurrentWeather();
initStorageAndCities();