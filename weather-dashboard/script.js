const forecastData = [
  { day: 'Пн', tempC: 19, description: 'Ясно', icon: '☀️' },
  { day: 'Вт', tempC: 18, description: 'Хмарно', icon: '⛅' },
  { day: 'Ср', tempC: 16, description: 'Дощ', icon: '🌧️' },
  { day: 'Чт', tempC: 20, description: 'Сонячно', icon: '🌤️' },
  { day: 'Пт', tempC: -2, description: 'Заморозки', icon: '❄️' },
  { day: 'Сб', tempC: 24, description: 'Тепло', icon: '🔥' },
  { day: 'Нд', tempC: -5, description: 'Сніг', icon: '🌨️' }
];

const forecastContainer = document.querySelector('#forecast .cards');
const avgTempElement = document.querySelector('#avg-temp');

const placeholder = document.querySelector('.placeholder-card');
if (placeholder) {
  placeholder.remove();
}

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
    icon.textContent = item.icon;

    const temp = document.createElement('span');
    temp.classList.add('temp');
    temp.classList.add(item.tempC >= 19 ? 'temp--warm' : 'temp--cool');
    temp.textContent = `${item.tempC > 0 ? '+' : ''}${item.tempC}°C`;

    const desc = document.createElement('p');
    desc.classList.add('desc');
    desc.textContent = item.description;

    card.append(title, icon, temp, desc);
    forecastContainer.append(card);
  });

  if (avgTempElement && days.length > 0) {
    const average = (totalTemp / days.length).toFixed(1);
    const sign = Number(average) > 0 ? '+' : '';
    avgTempElement.textContent = `Середня температура: ${sign}${average}°C`;
  }
}

renderForecast(forecastData);