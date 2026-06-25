const { Telegraf, Scenes, session } = require('telegraf');

// --- Переменные окружения ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN не найден");
    process.exit(1);
}

const ADMIN_ID = parseInt(process.env.ADMIN_ID);
if (!ADMIN_ID) {
    console.error("❌ ADMIN_ID не найден");
    process.exit(1);
}

// --- Создание бота ---
const bot = new Telegraf(BOT_TOKEN);

// --- Сцены (FSM) ---

// Сцена описания
const descriptionScene = new Scenes.BaseScene('description');
descriptionScene.enter((ctx) => {
    ctx.reply('👋 Добро пожаловать в бот по скупке устройств!\n\n📱 Пожалуйста, опишите ваше устройство: модель, состояние, комплектацию и любые другие детали.');
});
descriptionScene.on('text', (ctx) => {
    ctx.session.description = ctx.message.text;
    ctx.reply('📸 Отлично! Теперь отправьте фотографии устройства (можно несколько). Когда закончите, напишите "готово".');
    ctx.session.photos = [];
    ctx.scene.enter('photos');
});
descriptionScene.on('message', (ctx) => {
    ctx.reply('❓ Пожалуйста, опишите устройство текстом.');
});

// Сцена фотографий
const photosScene = new Scenes.BaseScene('photos');
photosScene.on('photo', (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    ctx.session.photos.push(photo.file_id);
    ctx.reply(`📸 Фото ${ctx.session.photos.length} получено. Отправьте еще или напишите "готово".`);
});
photosScene.on('text', (ctx) => {
    if (ctx.message.text.toLowerCase() === 'готово') {
        if (ctx.session.photos.length === 0) {
            ctx.reply('⚠️ Вы не отправили ни одного фото. Пожалуйста, отправьте хотя бы одну фотографию.');
            return;
        }
        ctx.reply('💰 Теперь укажите цену в рублях (цифрами).');
        ctx.scene.enter('price');
    } else {
        ctx.reply('❓ Отправьте фото или напишите "готово".');
    }
});
photosScene.on('message', (ctx) => {
    ctx.reply('❓ Пожалуйста, отправьте фотографию.');
});

// Сцена цены
const priceScene = new Scenes.BaseScene('price');
priceScene.enter((ctx) => {
    ctx.reply('💰 Введите цену цифрами (например: 15000)');
});
priceScene.on('text', (ctx) => {
    const price = ctx.message.text;
    if (!/^\d+$/.test(price)) {
        ctx.reply('⚠️ Введите цену цифрами. Например: 15000');
        return;
    }
    
    // --- Отправка админу ---
    const username = ctx.from.username || 'не указан';
    const userId = ctx.from.id;
    const description = ctx.session.description || 'Не указано';
    const photos = ctx.session.photos || [];
    
    let adminText = `🆕 **НОВАЯ ЗАЯВКА НА СКУПКУ!**\n\n`;
    adminText += `👤 **Пользователь:** @${username}\n`;
    adminText += `🆔 **ID:** \`${userId}\`\n\n`;
    adminText += `📝 **Описание:**\n${description}\n\n`;
    adminText += `💰 **Цена:** ${price} ₽\n\n`;
    adminText += `📸 **Фотографии:** (отправлены ниже)`;
    
    ctx.telegram.sendMessage(ADMIN_ID, adminText, { parse_mode: 'Markdown' });
    for (const photoId of photos) {
        ctx.telegram.sendPhoto(ADMIN_ID, photoId);
    }
    
    ctx.reply('✅ Ваша заявка принята! Ожидайте, скоро с вами свяжется наш менеджер.');
    ctx.scene.leave();
});
priceScene.on('message', (ctx) => {
    ctx.reply('❓ Введите цену цифрами.');
});

// --- Регистрация сцен ---
const stage = new Scenes.Stage([descriptionScene, photosScene, priceScene]);
bot.use(session());
bot.use(stage.middleware());

// --- Команда /start ---
bot.start((ctx) => {
    ctx.session = {};
    ctx.scene.enter('description');
});

// --- Запуск ---
bot.launch()
    .then(() => console.log('✅ Бот успешно запущен!'))
    .catch(err => {
        console.error('❌ Ошибка запуска:', err);
        process.exit(1);
    });

// --- Graceful stop ---
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
