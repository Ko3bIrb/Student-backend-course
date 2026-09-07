const express = require('express');
const app = express();
const port = 3000;

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.get('/api/users', (req, res) => {
    const users = [
        { id: 1, name: 'Алексей Иванов', email: 'alex@mail.ru' },
        { id: 2, name: 'Мария Петрова', email: 'maria@mail.ru' },
        { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@mail.ru' }
    ];
    res.json(users);
});

app.get('/api/companies', (req, res) => {
    const companies = [
        { id: 1, name: 'ООО "ТехноПром"', city: 'Москва' },
        { id: 2, name: 'ЗАО "ИнноСофт"', city: 'Санкт-Петербург' },
        { id: 3, name: 'ООО "ДиджиталСервис"', city: 'Казань' }
    ];
    res.json(companies);
});

app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    res.json({
        message: 'Информация о пользователе',
        userId: userId
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});