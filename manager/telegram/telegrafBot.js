function getBot(conf) {
    const path = require('path');
    const Telegraf = require('telegraf');
    const HttpsProxyAgent = require('https-proxy-agent');
    const commandArgsMiddleware = require(path.join(__dirname + '/commandArgs'));
    const {
        turnOnBot,
        turnOffBot,
        queueCreateBot,
        queueClearBot,
        showLog,
        sendPhotoToAdmin,
        sendMsgToAdmin
    } = require(path.join(__dirname,'/commands/mainCommands'));
    const token = conf.telegram.api;
    const bot = new Telegraf(token, {
        telegram: { agent: new HttpsProxyAgent(conf.telegram.proxy) }
    });
    bot.arrOfAdmin = conf.telegram.admins;


    bot.command("turn_on", turnOnBot);
    bot.command("turn_off", turnOffBot);
    bot.command('show_log', showLog);
    bot.command('queue_create', queueCreateBot);
    bot.command('queue_clear', queueClearBot);

    bot.sendMsgToAdmin = sendMsgToAdmin.bind(bot);
    bot.sendPhotoToAdmin = sendPhotoToAdmin.bind(bot);
    bot.use(commandArgsMiddleware());
    return bot;
}

module.exports = getBot;