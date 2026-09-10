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

// Початковий рендер даних під час завантаження сторінки
renderForecast(forecastData);