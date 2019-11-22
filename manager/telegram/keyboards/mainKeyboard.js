const Markup = require('telegraf/markup');

const keyboardON = Markup.inlineKeyboard([
    [Markup.callbackButton('Поисковый бот', 'seach_on')],
    [Markup.callbackButton('Ночной бот', 'night_on')],
    [Markup.callbackButton('Ночной бот (Екат)', 'night_on_ekat')],
    [Markup.callbackButton('❗️ Запись', 'sign_on')],
    [Markup.callbackButton('❗️ Запись (Екат)', 'sign_on_ekat')]
]);

const keyboardOFF = Markup.inlineKeyboard([
    [Markup.callbackButton('Поисковый бот', 'seach_off')],
    [Markup.callbackButton('Ночной бот', 'night_off')],
    [Markup.callbackButton('Ночной бот (Екат)', 'night_off_ekat')],
    [Markup.callbackButton('❗️ Запись', 'sign_off')],
    [Markup.callbackButton('❗️ Запись (Екат)', 'sign_off_ekat')]
]);

const queueCreate = Markup.inlineKeyboard([
    [Markup.callbackButton('Создать очередь для поиска', 'queue_create_seach')],
    [Markup.callbackButton('Создать очередь для ночного', 'queue_create_night')],
    [Markup.callbackButton('Создать очередь для ночного (Екат)', 'queue_create_night_ekat')],
    [Markup.urlButton('✍️ Создать вручную', 'https://ivantsovy.ru/queue/')],
    [Markup.callbackButton('⚙️ Информация', 'queue_create_info')]
]);

const queueClear = Markup.inlineKeyboard([
    [Markup.callbackButton('Очистить очередь для поиска', 'queue_clear_seach')],
    [Markup.callbackButton('Очистить очередь для ночного', 'queue_clear_night')],
    [Markup.callbackButton('Очистить очередь для ночного (Екат)', 'queue_clear_night_ekat')]
]);

module.exports = {
    keyboardON: keyboardON,
    keyboardOFF: keyboardOFF,
    queueCreate: queueCreate,
    queueClear: queueClear
}