// URL сервісу Open-Meteo
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
  95: { desc: 'Гроза', icon: '⛈️' },
  96: { desc: 'Гроза з невеликим градом', icon: '⛈️' },
  99: { desc: 'Гроза з сильним градом', icon: '⛈️' }
};

// Вихідний масив об'єктів прогнозу погоди
const forecastData = [
  { day: 'Пн', tempC: 19, description: 'Ясно', icon: '☀️' },
  { day: 'Вт', tempC: 18, description: 'Хмарно', icon: '⛅' },
  { day: 'Ср', tempC: 16, description: 'Дощ', icon: '🌧️' },
  { day: 'Чт', tempC: 20, description: 'Сонячно', icon: '🌤️' },
  { day: 'Пт', tempC: -2, description: 'Заморозки', icon: '❄️' },
  { day: 'Сб', tempC: 24, description: 'Тепло', icon: '🔥' },
  { day: 'Нд', tempC: -5, description: 'Сніг', icon: '🌨️' }
];

// DOM-елементи відображення даних
const forecastContainer = document.querySelector('#forecast .cards');
const avgTempElement = document.querySelector('#avg-temp');
const warmestBtn = document.querySelector('#warmest-btn');
const warmestResult = document.querySelector('#warmest-result');

// Елементи блоку поточної погоди
const refreshWeatherBtn = document.querySelector('#refresh-weather-btn');
const weatherError = document.querySelector('#weather-error');
const currentTemp = document.querySelector('#current-temp');
const currentDesc = document.querySelector('#current-desc');
const currentIcon = document.querySelector('#current-icon');
const currentTime = document.querySelector('#current-time');
const adviceDesc = document.querySelector('#advice .desc');

// DOM-елементи форми та полів введення
const weatherForm = document.querySelector('#weather-form');
const dayInput = document.querySelector('#day-input');
const tempInput = document.querySelector('#temp-input');
const descInput = document.querySelector('#desc-input');

// Видалення статичного плейсхолдера
const placeholder = document.querySelector('.placeholder-card');
if (placeholder) {
  placeholder.remove();
}

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

// Асинхронне отримання даних погоди
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

/**
 * Рендерить картки прогнозу погоди в DOM та розраховує середню температуру
 */
function renderForecast(days) {
  forecastContainer.innerHTML = '';
  let totalTemp = 0;

  days.forEach(item => {
    totalTemp += item.tempC;

    const card = document.createElement('article');
    card.classList.add('card');
    card.setAttribute('data-day', item.day);
    card.dataset.temp = item.tempC;

    if (item.tempC < 0) {
      card.classList.add('cold');
    }

    const title = document.createElement('h3');
    title.textContent = item.day;

    const icon = document.createElement('span');
    icon.classList.add('weather-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon || resolveWeatherIcon(item.description, item.tempC);

    const temp = document.createElement('span');
    temp.classList.add('temp');
    temp.classList.add(item.tempC >= 19 ? 'temp--warm' : 'temp--cool');
    temp.textContent = `${item.tempC > 0 ? '+' : ''}${item.tempC}°C`;

    const desc = document.createElement('p');
    desc.classList.add('desc');
    desc.textContent = item.description || 'Без опадів';

    card.append(title, icon, temp, desc);
    forecastContainer.append(card);
  });

  if (avgTempElement && days.length > 0) {
    const average = (totalTemp / days.length).toFixed(1);
    const sign = Number(average) > 0 ? '+' : '';
    avgTempElement.textContent = `Середня температура: ${sign}${average}°C`;
  }
}

// Клієнтська валідація поля температури на подію input
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

// Обробка надсилання форми без перезавантаження сторінки
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

  forecastData.push(newForecastItem);
  renderForecast(forecastData);
  weatherForm.reset();
  tempInput.setCustomValidity('');
});

// Обробка другої події варіанта: клік по кнопці визначення найтеплішого дня
warmestBtn.addEventListener('click', () => {
  if (forecastData.length === 0) {
    warmestResult.textContent = 'Дані прогнозу відсутні';
    return;
  }

  const warmest = forecastData.reduce((prev, current) => {
    return current.tempC > prev.tempC ? current : prev;
  });

  const sign = warmest.tempC > 0 ? '+' : '';
  warmestResult.textContent = `Найтепліший день: ${warmest.day} (${sign}${warmest.tempC}°C, ${warmest.description})`;
});

// Слухач кнопки оновлення
if (refreshWeatherBtn) {
  refreshWeatherBtn.addEventListener('click', loadCurrentWeather);
}

// Початковий рендер даних під час завантаження сторінки
renderForecast(forecastData);
loadCurrentWeather();