#!/usr/bin/env node
process.env.TZ = 'Europe/Moscow';
var path = require('path');
const conf = require(path.join(__dirname, '/conf.json'));
var socket = require('socket.io-client')(conf.socket);
var bot = require(path.join(__dirname, '/manager/telegram/telegrafBot'))(conf);
var gs = require(path.join(__dirname, '/manager/google-sheet/gs'))(conf);
var Queue = require(path.join(__dirname, '/manager/queue/Queue'))(conf);
var Cycle = require(path.join(__dirname, '/manager/cycle/Cycle'));
var socketHandler = require(path.join(__dirname, '/manager/socket/socketHandler'));
// Queues
var queueSeach = new Queue({ URL: conf.queue.QueueUrls.seach });
var queueNight = new Queue({ URL: conf.queue.QueueUrls.night });
var queueSign = new Queue({ URL: conf.queue.QueueUrls.sign });
var queueSigned = new Queue({ URL: conf.queue.QueueUrls.signed });
//Cycles
var cycleSeach = new Cycle({ socket: socket, queue: queueSeach });
var cycleNight = new Cycle({ socket: socket, queue: queueNight, nameCycle: "Ночь", numClients: 3, cronScheme: conf.cronJob.night });
var cycleSign = new Cycle({ socket: socket, queue: queueSign, nameCycle: "Запись", numClients: 5, cronScheme: conf.cronJob.sign });
//Params
var gsParams = { nameOfTable: 'МСК' };

bot.action("seach_on", ({ reply }) => {
    if (cycleSeach.on) {
        reply(`Уже работает`);
        return 0;
    }
    cycleSeach.on = true;
    cycleSeach.tick()
        .then(msg => bot.sendMsgToAdmin(msg))
        .catch(err => console.log(err));
})

bot.action("seach_off", ({ reply }) => {
    cycleSeach.on = false;
    reply("Бот выключен Поиск");
})

bot.action("night_on", ({ reply }) => {
    if (cycleNight.on) {
        reply(`Уже работает`);
        return 0;
    }
    cycleNight.on = true;
    cycleNight.cronStart(bot);
})

bot.action("night_off", ({ reply }) => {
    cycleNight.on = false;
    cycleNight.cronStop();
    reply("Бот выключен Ночь");
})

bot.action("sign_on", ({ reply }) => {
    if (cycleSign.on) {
        reply(`Уже работает`);
        return 0;
    }
    cycleSign.on = true;
    cycleSign.cronStart(bot);
})

bot.action("sign_off", ({ reply }) => {
    cycleSign.on = false;
    cycleSign.cronStop();
    reply("Бот выключен Запись");
})

bot.action("queue_create_seach", async ({ replyWithMarkdown }) => {
    if (queueSeach.process) {
        replyWithMarkdown(`*Подождите...*`);
        return 0;
    }
    var nowTime = new Date();
    var gsMsk = await gs.build(gsParams);
    var clients = await gsMsk.getClientsForSeach();
    queueSeach.generateQueue(clients)
        .then(() => {
            replyWithMarkdown(`Очередь для поскового бота создана за 
*${(new Date() - nowTime) / 1000}* сек.`);
        })
        .catch(err => replyWithMarkdown(err));
    return 0;
})

bot.action("queue_create_night", async ({ replyWithMarkdown }) => {
    if (queueNight.process) {
        replyWithMarkdown(`*Подождите...*`);
        return 0;
    }
    var nowTime = new Date();
    var gsMsk = await gs.build(gsParams);
    var clients = await gsMsk.getClientsForNight();
    queueNight.generateQueue(clients)
        .then(() => {
            replyWithMarkdown(`Очередь для ночного бота создана за 
*${(new Date() - nowTime) / 1000}* сек.`);
        })
        .catch(err => replyWithMarkdown(err));
    return 0;
})

bot.action("queue_create_info", async ({ replyWithMarkdown }) => {
    let seachClients = await queueSeach.numOfClients();
    let nightClients = await queueNight.numOfClients();
    replyWithMarkdown(`В очереди для поиска: *${seachClients}* 
В очереди для ночного: *${nightClients}*`);
    return 0;
})

bot.action("queue_clear_seach", async ({ reply }) => {
    await queueSeach.clearQueue();
    reply("Очередь для поиска очищена!");
    return 0;
})

bot.action("queue_clear_night", async ({ reply }) => {
    await queueNight.clearQueue();
    reply("Очередь для ночного бота очищена!");
    return 0;
})

gs.build(gsParams)
    .then(gsRes => {
        socketHandler({
            socket: socket,
            bot: bot,
            cycleSeach: cycleSeach,
            queueSign: queueSign,
            queueSigned: queueSigned,
            gs: gsRes
        });
        bot.launch()
    })
    .catch(err => console.log(err));