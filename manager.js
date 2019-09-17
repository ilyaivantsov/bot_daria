#!/usr/bin/env node
process.env.TZ = 'Europe/Moscow';
var socket = require('socket.io-client')('http://localhost:6481');
var path = require('path');
var CronJob = require('cron').CronJob;
const path_to = require(path.join(__dirname, '/common/path_to'));
const conf = require(path.join(__dirname, '/conf.json'));
var bot = require(path.join(__dirname, '/manager/telegram/telegrafBot'))(conf);
var gs = require(path.join(__dirname, '/manager/google-sheet/gs'))(conf);
var Queue = require(path.join(__dirname, '/manager/queue/Queue'))(conf);
var queueSeach = new Queue({ URL: conf.queue.QueueUrls.test });
var queueNight = new Queue({ URL: conf.queue.QueueUrls.test });
//
var gsParams = { nameOfTable: 'ЕКАТ' };

bot.action("seach_on", async () => {

})

bot.action("seach_off", async () => {

})

bot.action("night_on", async () => {

})

bot.action("night_off", async () => {

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

bot.launch()