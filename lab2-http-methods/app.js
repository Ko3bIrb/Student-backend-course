const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware для парсинга JSON
app.use(express.json());

// ============ ЛОГИРОВАНИЕ В ФАЙЛ ============
const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use((req, res, next) => {
  const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  console.log(logLine.trim());
  logStream.write(logLine);
  next();
});

// ============ ХРАНИЛИЩЕ ДАННЫХ ============
let users = [
  { id: 1, name: 'Иван Иванов', email: 'ivan@example.com' },
  { id: 2, name: 'Пётр Петров', email: 'petr@example.com' },
  { id: 3, name: 'Анна Сидорова', email: 'anna@example.com' },
  { id: 4, name: 'Мария Смирнова', email: 'maria@example.com' },
  { id: 5, name: 'Алексей Кузнецов', email: 'alex@example.com' }
];

let nextId = 6;

// ============ ВАЛИДАЦИЯ ============
function validateUser(body, isPatch = false) {
  const errors = [];

  if (!isPatch || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('Поле name обязательно и должно быть непустой строкой');
    }
  }

  if (!isPatch || body.email !== undefined) {
    if (!body.email || typeof body.email !== 'string') {
      errors.push('Поле email обязательно и должно быть строкой');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        errors.push('Email имеет неверный формат');
      }
    }
  }

  return errors;
}

// ============ CRUD-ОПЕРАЦИИ ============

// GET /users – список с поиском, сортировкой, пагинацией
app.get('/users', (req, res) => {
  let result = [...users];

  // Поиск по name
  const search = req.query.search;
  if (search) {
    result = result.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Сортировка
  const sortField = req.query.sort;
  const order = req.query.order === 'desc' ? -1 : 1;
  if (sortField && ['id', 'name', 'email'].includes(sortField)) {
    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * order;
      if (a[sortField] > b[sortField]) return 1 * order;
      return 0;
    });
  }

  // Пагинация
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginated = result.slice(startIndex, endIndex);

  res.json({
    total: result.length,
    page: page,
    limit: limit,
    count: paginated.length,
    users: paginated
  });
});

// GET /users/stats – статистика
app.get('/users/stats', (req, res) => {
  const total = users.length;
  const domains = {};
  users.forEach(u => {
    const domain = u.email.split('@')[1];
    domains[domain] = (domains[domain] || 0) + 1;
  });

  res.json({
    totalUsers: total,
    domains: domains,
    averageNameLength: total > 0
      ? (users.reduce((sum, u) => sum + u.name.length, 0) / total).toFixed(2)
      : 0
  });
});

// GET /users/:id/related – связанные (по домену email)
app.get('/users/:id/related', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const domain = user.email.split('@')[1];
  const related = users.filter(u => u.id !== id && u.email.endsWith('@' + domain));

  res.json({
    user: user,
    relatedByDomain: related
  });
});

// GET /users/:id – один пользователь
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json(user);
});

// POST /users – создание
app.post('/users', (req, res) => {
  const errors = validateUser(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const newUser = {
    id: nextId++,
    name: req.body.name.trim(),
    email: req.body.email.trim()
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// POST /users/bulk – массовое создание
app.post('/users/bulk', (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Ожидается массив пользователей' });
  }

  const created = [];
  const errors = [];

  req.body.forEach((item, index) => {
    const itemErrors = validateUser(item);
    if (itemErrors.length > 0) {
      errors.push({ index, errors: itemErrors });
    } else {
      const newUser = {
        id: nextId++,
        name: item.name.trim(),
        email: item.email.trim()
      };
      users.push(newUser);
      created.push(newUser);
    }
  });

  if (errors.length > 0 && created.length === 0) {
    return res.status(400).json({ errors });
  }

  res.status(201).json({
    created: created,
    errors: errors.length > 0 ? errors : undefined
  });
});

// PUT /users/:id – полное обновление
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const errors = validateUser(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  users[index] = {
    id: id,
    name: req.body.name.trim(),
    email: req.body.email.trim()
  };

  res.json(users[index]);
});

// PATCH /users/:id – частичное обновление
app.patch('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const errors = validateUser(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  if (req.body.name !== undefined) users[index].name = req.body.name.trim();
  if (req.body.email !== undefined) users[index].email = req.body.email.trim();

  res.json(users[index]);
});

// DELETE /users – удалить всех
app.delete('/users', (req, res) => {
  const count = users.length;
  users = [];
  res.status(200).json({ message: `Удалено пользователей: ${count}` });
});

// DELETE /users/:id – удалить одного
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  users.splice(index, 1);
  res.status(204).send();
});

// ============ ОБРАБОТКА 404 ============
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// ============ ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ============
app.use((err, req, res, next) => {
  console.error('Ошибка:', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ============ ЗАПУСК ============
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});