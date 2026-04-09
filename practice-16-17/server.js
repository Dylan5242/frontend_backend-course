// http-server --ssl --cert localhost.pem --key localhost-key.pem -p 3000


const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');


// Хранилище активных напоминаний: ключ - id заметки, значение - объект с таймером и данными
const reminders = new Map();

const vapidKeys = {
    publicKey: 'BOMr3j4k5jqF2I2bPIDo8jxnw4rXRuPMIqEIdShc4Lswh1dA-lqPvt6bM5aMRj9Z-edJgoMYfJcrzny6d3I2AOg',
    privateKey: 'qitkZYNj3sAabhqsuxj3s-YmqzSsrzgeiAT9IyXDV0I'
};
webpush.setVapidDetails(
    'mailto:The_Skelies@mail.ru',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];

// HTTPS опции (сертификаты от http-server)
const options = {
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem')
};

const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('Клиент подключён:', socket.id);
    socket.on('newTask', (task) => {
        io.emit('taskAdded', task);
        const payload = JSON.stringify({ title: 'Новая задача', body: task.text });
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
        });
    });

    socket.on('newReminder', (reminder) => {
        const { id, text, reminderTime } = reminder;
        const delay = reminderTime - Date.now();
        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({
                title: '!!! Напоминание',
                body: text,
                reminderId: id
            });

            subscriptions.forEach(sub => {
                webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
            });

            reminders.delete(id);

        }, delay);

        reminders.set(id, {timeoutId, text, reminderTime });
    })

    socket.on('disconnect', () => {
        console.log('Клиент отключён:', socket.id);
    });
});

app.post('/subscribe', (req, res) => {
    subscriptions.push(req.body);
    res.status(201).json({ message: 'Подписка сохранена' });
});
app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    res.status(200).json({ message: 'Подписка удалена' });
});


app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    if (!reminderId || !reminders.has(reminderId)) {
        return res.status(404).json({ error: 'Reminder not found' });
    }
    const reminder = reminders.get(reminderId);
    // Отменяем предыдущий таймер
    clearTimeout(reminder.timeoutId);
    // Устанавливаем новый через 5 минут (300 000 мс)
    const newDelay = 5 * 60 * 1000;
    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({
            title: 'Напоминание отложено',
            body: reminder.text,
            reminderId: reminderId
        });
        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err =>
                console.error('Push error:', err));
        });
        reminders.delete(reminderId);
    }, newDelay);
    // Обновляем хранилище
    reminders.set(reminderId, {
        timeoutId: newTimeoutId,
        text: reminder.text,
        reminderTime: Date.now() + newDelay
    });
    res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});


const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Сервер запущен на https://localhost:${PORT}`);
});



