console.log('script.js підключено');

const forecast = [
  { day: 'Пн', temp: 19 },
  { day: 'Вт', temp: 18 },
  { day: 'Ср', temp: 16 },
  { day: 'Чт', temp: 20 },
  { day: 'Пт', temp: -2 },
  { day: 'Сб', temp: 24 },
  { day: 'Нд', temp: -5 }
];

const toFahrenheit = c => (c * 9) / 5 + 32;

function processForecast(data) {
  for (const item of data) {
    const tempF = toFahrenheit(item.temp);
    if (item.temp < 0) {
      console.log(`${item.day}: ${item.temp}°C (${tempF.toFixed(1)}°F) — морозно`);
    } else {
      console.log(`${item.day}: ${item.temp}°C (${tempF.toFixed(1)}°F)`);
    }
  }
}

processForecast(forecast);