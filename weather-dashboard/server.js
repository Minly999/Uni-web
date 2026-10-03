// Express-сервер для роздачі статики та погодного API
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Локальні дані міст
const cities = [
  { id: 'kyiv', name: 'Київ', lat: 50.45, lon: 30.52 },
  { id: 'lviv', name: 'Львів', lat: 49.84, lon: 24.03 },
  { id: 'odesa', name: 'Одеса', lat: 46.48, lon: 30.73 },
  { id: 'kharkiv', name: 'Харків', lat: 49.99, lon: 36.23 },
  { id: 'dnipro', name: 'Дніпро', lat: 48.46, lon: 35.04 }
];

// Роздача статичних файлів клієнта (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Ендпоінт списку міст
app.get('/api/cities', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(cities);
});

// Ендпоінт деталей одного міста за id
app.get('/api/cities/:id', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const city = cities.find(c => c.id.toLowerCase() === req.params.id.toLowerCase());

  if (!city) {
    return res.status(404).json({ error: `Місто з id '${req.params.id}' не знайдено` });
  }

  res.status(200).json(city);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер успішно запущено на http://localhost:${PORT}`);
});