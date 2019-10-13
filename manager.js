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
var queueNightEkat = new Queue({ URL: conf.queue.QueueUrls.nightEkat });
var queueSign = new Queue({ URL: conf.queue.QueueUrls.sign });
var queueSigned = new Queue({ URL: conf.queue.QueueUrls.signed });
//Cycles
var cycleSeach = new Cycle({ socket: socket, queue: queueSeach, nameCycle: "Поиск" });
var cycleNight = new Cycle({ socket: socket, queue: queueNight, nameCycle: "Ночь", numClients: 3, cronScheme: conf.cronJob.night });
var cycleNightEkat = new Cycle({ socket: socket, queue: queueNightEkat, city: "Ekat", nameCycle: "Ночь (Екат)", numClients: 1, cronScheme: conf.cronJob.night });
var cycleSign = new Cycle({ socket: socket, queue: queueSign, nameCycle: "Запись", numClients: 5, cronScheme: conf.cronJob.sign });
//Params
var gsParams = { nameOfTable: conf.google_sheet.nameOfTable };
var gsParamsEkat = { nameOfTable: conf.google_sheet.nameOfTableEkat };

bot.action("seach_on", ({ reply }) => {
    if (cycleSeach.on) {
        reply(`Уже работает`);
        return 0;
    }
    bot.sendMsgToAdmin('🙉 Поисковый бот включен!');
    cycleSeach.on = true;
    cycleSeach.tick()
        .then(msg => bot.sendMsgToAdmin(msg))
        .catch(err => console.log(err));
})

bot.action("seach_off", () => {
    cycleSeach.on = false;
    bot.sendMsgToAdmin("🙈 Поисковый бот выключен!");
})

bot.action("night_on", ({ reply }) => {
    if (cycleNight.on) {
        reply(`Уже работает`);
        return 0;
    }
    bot.sendMsgToAdmin('🙉 Ночной бот включен!');
    cycleNight.on = true;
    cycleNight.cronStart(bot);
})

bot.action("night_off", () => {
    cycleNight.on = false;
    cycleNight.cronStop();
    bot.sendMsgToAdmin("🙈 Ночной бот выключен!");
})

bot.action("night_on_ekat", ({ reply }) => {
    if (cycleNightEkat.on) {
        reply(`Уже работает`);
        return 0;
    }
    bot.sendMsgToAdmin('🙉 Ночной бот включен! (Екат)');
    cycleNightEkat.on = true;
    cycleNightEkat.cronStart(bot);
})

bot.action("night_off_ekat", () => {
    cycleNightEkat.on = false;
    cycleNightEkat.cronStop();
    bot.sendMsgToAdmin("🙈 Ночной бот выключен! (Екат)");
})

bot.action("sign_on", ({ reply }) => {
    if (cycleSign.on) {
        reply(`Уже работает`);
        return 0;
    }
    bot.sendMsgToAdmin('🙉 Бот для записи включен!');
    cycleSign.on = true;
    cycleSign.cronStart(bot);
})

bot.action("sign_off", () => {
    cycleSign.on = false;
    cycleSign.cronStop();
    bot.sendMsgToAdmin("🙈 Бот для записи выключен!");
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

bot.action("queue_create_night_ekat", async ({ replyWithMarkdown }) => {
    if (queueNightEkat.process) {
        replyWithMarkdown(`*Подождите...*`);
        return 0;
    }
    var nowTime = new Date();
    var gsEkat = await gs.build(gsParamsEkat);
    var clients = await gsEkat.getClientsForNight();
    queueNightEkat.generateQueue(clients)
        .then(() => {
            replyWithMarkdown(`Очередь для ночного бота создана за 
*${(new Date() - nowTime) / 1000}* сек. (Екат)`);
        })
        .catch(err => replyWithMarkdown(err));
    return 0;
})

bot.action("queue_create_info", async ({ replyWithMarkdown }) => {
    let seachClients = await queueSeach.numOfClients();
    let nightClients = await queueNight.numOfClients();
    let signClients = await queueSign.numOfClients();
    let ekatClients = await queueNightEkat.numOfClients();
    replyWithMarkdown(`В очереди для поиска: *${seachClients}* 
В очереди для ночного: *${nightClients}*
В очереди для записи: *${signClients}*
Екат: *${ekatClients}*`);
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

bot.action("queue_clear_night_ekat", async ({ reply }) => {
    await queueNightEkat.clearQueue();
    reply("Очередь для ночного бота очищена! (Екат)");
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