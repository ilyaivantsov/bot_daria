function getBot(conf) {
    const fs = require('fs');
    const path = require('path');
    const Telegraf = require('telegraf');
    const HttpsProxyAgent = require('https-proxy-agent');
    const Markup = require('telegraf/markup');
    const commandArgsMiddleware = require(path.join(__dirname + '/commandArgs'));
    const token = conf.telegram.api;
    const bot = new Telegraf(token, {
        telegram: { agent: new HttpsProxyAgent(conf.telegram.proxy) }
    });
    const arrOfAdmin = conf.telegram.admins;
    const keyboardON = Markup.inlineKeyboard([
        [Markup.callbackButton('Поисковый бот', 'seach_on')],
        [Markup.callbackButton('Ночной бот', 'night_on')]
    ]);
    const keyboardOFF = Markup.inlineKeyboard([
        [Markup.callbackButton('Поисковый бот', 'seach_off')],
        [Markup.callbackButton('Ночной бот', 'night_off')]
    ]);


    /**
     * 
     * @param {String} msg Сообщение администраторам
     */
    function sendMsgToAdmin(msg) {
        arrOfAdmin.forEach((id) => { bot.telegram.sendMessage(id, msg) });
    }

    /**
     * 
     * @param {String} path_to Полный путь до фотографии 
     * @param {String} msg  Описание фотографии
     */
    function sendPhotoToAdmin(path_to, msg) {
        bot.telegram.sendPhoto(arrOfAdmin[0], {
            source: fs.createReadStream(path_to)
        }).then(ans => {
            arrOfAdmin.forEach((id) => {
                bot.telegram.sendPhoto(id, ans.photo[ans.photo.length - 1].file_id, {
                    caption: msg
                })
            });
        })
    }

    bot.command("turn_on", ({ reply }) => {
        reply('Какого бота включить? Выберите 👇🏻',
            keyboardON
                .oneTime()
                .resize()
                .extra()
        )
    });

    bot.command("turn_off", ({ reply }) => {
        reply('Какого бота выключить? Выберите 👇🏻',
            keyboardOFF
                .oneTime()
                .resize()
                .extra()
        )
    });

    bot.command('show_log', (ctx) => {
        ctx.telegram.sendDocument(ctx.from.id, {
            source: fs.createReadStream(path.join(__dirname, '..', '..', 'log.txt')),
            filename: `log.txt`
        })
    });

    bot.sendMsgToAdmin = sendMsgToAdmin;
    bot.sendPhotoToAdmin = sendPhotoToAdmin;
    bot.use(commandArgsMiddleware());
    return bot;
}

module.exports = getBot;