const bcrypt = require("bcrypt");

const bcrypt = require("bcrypt");
async function hashPassword(password) {
    const rounds = 10; // типичное значение: 10–12
    return bcrypt.hash(password, rounds);
}
// Использование
(async () => {
    const hash = await hashPassword("qwerty123");
    console.log(hash);
})();

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
// Проверка
(async () => {
    const hash = await bcrypt.hash("qwerty123", 10);
    console.log(await verifyPassword("qwerty123", hash));
})();

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
// Проверка
(async () => {
    const hash = await bcrypt.hash("qwerty123", 10);
    console.log(await verifyPassword("qwerty123", hash));
})();

