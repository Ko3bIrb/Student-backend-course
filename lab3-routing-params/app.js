const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ДАННЫЕ
const cities = [
  { id: 1, name: 'Москва', population: 13000000, country: 'Россия', area: 2561 },
  { id: 2, name: 'Санкт-Петербург', population: 5600000, country: 'Россия', area: 1439 },
  { id: 3, name: 'Новосибирск', population: 1600000, country: 'Россия', area: 505 },
  { id: 4, name: 'Екатеринбург', population: 1500000, country: 'Россия', area: 1112 },
  { id: 5, name: 'Казань', population: 1250000, country: 'Россия', area: 425 }
];

const allowedSortFields = ['id', 'name', 'population', 'area'];

// ВСПОМОГАТЕЛЬНЫЕ
function parsePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// БАЗОВЫЙ + СРЕДНИЙ УРОВЕНЬ
// GET /cities — список + поиск + фильтр + сортировка + пагинация
app.get('/cities', (req, res) => {
  let result = [...cities];

  const search = req.query.search;
  if (search) {
    result = result.filter(c =>
      c.name.toLowerCase().includes(String(search).toLowerCase())
    );
  }

  const country = req.query.country;
  if (country) {
    result = result.filter(c =>
      c.country.toLowerCase() === String(country).toLowerCase()
    );
  }

  const sort = req.query.sort;
  const order = req.query.order || 'asc';

  if (sort) {
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({
        error: `Поле сортировки должно быть одним из: ${allowedSortFields.join(', ')}`
      });
    }
    if (!['asc', 'desc'].includes(order)) {
      return res.status(400).json({ error: 'Параметр order должен быть asc или desc' });
    }
    result.sort((a, b) => {
      if (a[sort] === b[sort]) return 0;
      const cmp = a[sort] > b[sort] ? 1 : -1;
      return order === 'desc' ? -cmp : cmp;
    });
  }

  const page = req.query.page === undefined ? 1 : parseInt(req.query.page, 10);
  const limit = req.query.limit === undefined ? 10 : parseInt(req.query.limit, 10);

  if (Number.isNaN(page) || page < 1) {
    return res.status(400).json({ error: 'page должен быть целым числом >= 1' });
  }
  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'limit должен быть целым числом от 1 до 100' });
  }

  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  res.json({
    count: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit) || 0,
    cities: paginated
  });
});

// GET /cities/:id — один город
app.get('/cities/:id', (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID должен быть положительным целым числом' });
  }

  const city = cities.find(c => c.id === id);
  if (!city) {
    return res.status(404).json({ error: 'Город не найден' });
  }

  res.json(city);
});

// GET /cities/:id/area — площадь города
app.get('/cities/:id/area', (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID должен быть положительным целым числом' });
  }

  const city = cities.find(c => c.id === id);
  if (!city) {
    return res.status(404).json({ error: 'Город не найден' });
  }

  res.json({ city: city.name, area: city.area, unit: 'км²' });
});

// GET /countries/:country/cities — города страны
app.get('/countries/:country/cities', (req, res) => {
  const country = req.params.country;
  const filtered = cities.filter(c =>
    c.country.toLowerCase() === country.toLowerCase()
  );

  res.json({ country, count: filtered.length, cities: filtered });
});

// ПРОДВИНУТЫЙ УРОВЕНЬ 
// GET /cities/:id/details — детали с вложенными данными
app.get('/cities/:id/details', (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID должен быть положительным целым числом' });
  }

  const city = cities.find(c => c.id === id);
  if (!city) {
    return res.status(404).json({ error: 'Город не найден' });
  }

  const districts = [
    { id: 1, name: 'Центральный', cityId: id },
    { id: 2, name: 'Северный', cityId: id }
  ];

  res.json({
    city,
    districts,
    attractions: ['Кремль', 'Парк', 'Музей']
  });
});

// GET /countries/:country/cities/:cityId — город в стране
app.get('/countries/:country/cities/:cityId', (req, res) => {
  const { country, cityId } = req.params;

  const id = parsePositiveInt(cityId);
  if (id === null) {
    return res.status(400).json({ error: 'cityId должен быть положительным целым числом' });
  }

  const city = cities.find(c =>
    c.id === id && c.country.toLowerCase() === country.toLowerCase()
  );

  if (!city) {
    return res.status(404).json({
      error: `Город с ID=${cityId} не найден в стране ${country}`
    });
  }

  res.json({ country, city });
});

// 404 (wildcard — всегда последним) 
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
