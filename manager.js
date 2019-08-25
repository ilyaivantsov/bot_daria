#!/usr/bin/env node
process.env.TZ = 'Europe/Moscow';
var socket = require('socket.io-client')('http://localhost:6481');
var path = require('path');
var CronJob = require('cron').CronJob;
const conf = require(path.join(__dirname, '/conf.json'));
const path_to = require(path.join(__dirname, '/common/path_to'));
var Client = require(path.join(__dirname, '/manager/clients/Client'))(conf);
var bot = require(path.join(__dirname, '/manager/telegram/telegrafBot'))(conf);
var gs = require(path.join(__dirname, '/manager/google-sheet/gs'))(conf);
var Helper = require(path.join(__dirname, '/manager/helper/Helper'))(gs);
const proxyArr = ['91.188.239.25:30001','2.59.179.184:30001','2.59.177.164:30001'];

bot.command("go_bot", (ctx) => {
    var args = ctx.state.command.args;
    if (args.length != 2) {
        return ctx.reply('Ошибка! Введите /go_bot login password');
    }
    const [login, password] = args;
    var client = new Client({
        login: login, password: password, type: 'go', conf: {
            numOfReload: 5,
            delay: 10000,
            numOfTry: 10,
            quickCycle: true
        },
	proxy: proxyArr[Math.floor(Math.random() * proxyArr.length)]
    });
    bot.sendMsgToAdmin(`Зашел для записи под:
1. ${client.login}`);
    socket.emit('on bot', client, client.conf);
});

bot.action("seach_on", async ({ reply }) => {
    if (cycleSeach.turnON) {
        return reply("Поисковый бот уже работает!");
    }
    cycleSeach.turnON = true;
    bot.sendMsgToAdmin('🙉 Поисковый бот включен!');
    var { getClientList } = await gs;
    var arr = await getClientList('id');
    var clients = arr.map(client => new Client({ ...client, type: 'seach', conf: conf.confJob.seach }));
    cycleSeach.helper = new Helper({ numberOfClient: 1, clients: clients });
    await cycleSeach();
})

bot.action("seach_off", async () => {
    cycleSeach.turnON = false;
    bot.sendMsgToAdmin('🙈 Поисковый бот выключен!');
})

bot.action("night_on", async ({ reply }) => {
    if (cycleNight.turnON) {
        return reply("Ночной бот уже работает!");
    }
    cycleNight.turnON = true;
    bot.sendMsgToAdmin('🙉 Ночной бот включен!');
    var numberOfClient = 3;
    var { getClientList } = await gs;
    var arr = await getClientList('id', undefined, undefined, true);
    arr = arr.slice(0, arr.length - arr.length % numberOfClient);
    var clients = arr.map(client => new Client({ ...client, type: 'night', conf: conf.confJob.night }));
    cycleNight.helper = new Helper({ numberOfClient: numberOfClient, clients: clients });
    cycleNight.job = new CronJob('10 47 * * * *', () => { cycleNight() }, null, true, 'America/Los_Angeles');
    cycleNight.job.start();
})

bot.action("night_off", async ({ reply }) => {
    if (!cycleNight.turnON) {
        return reply("Ночной бот выключен!");
    }
    cycleNight.turnON = false;
    cycleNight.job.stop();
    bot.sendMsgToAdmin('🙈 Ночной бот выключен!');
})

async function cycleSeach() {
    var helper = cycleSeach.helper;
    await helper.clearCurrentClient();
    if (!cycleSeach.turnON) {
        return 0;
    }
    var clients = await helper.getClients();
    if (clients) {
        var msg = [];
        clients.forEach((client, i) => {
            msg.push(`${i + 1}. ${client.login}`);
            socket.emit('on bot', client, client.conf);
        });
        msg = msg.join('\n');
        bot.sendMsgToAdmin(`Зашел под:
${msg}`);
    } else {
        cycleSeach.turnON = false;
        bot.sendMsgToAdmin("Закончился список поисковых ботов. Для нового круга нажмите /turn_on");
    }
}

async function cycleNight() {
    var helper = cycleNight.helper;
    await helper.clearCurrentClient();
    if (!cycleNight.turnON) {
        return 0;
    }
    var clients = await helper.getClients();
    if (clients) {
        var msg = [];
        clients.forEach((client, i) => {
            msg.push(`${i + 1}. ${client.login}`);
            socket.emit('on bot', client, client.conf);
        });
        msg = msg.join('\n');
        bot.sendMsgToAdmin(`Зашел под:
${msg}`);
    } else {
        cycleNight.turnON = false;
        cycleNight.job.stop();
        bot.sendMsgToAdmin("Закончился список ночных ботов. Для нового круга нажмите /turn_on");
    }
}

async function singUp() {
    var numberOfClient = 3;
    var { getClientList } = await gs;
    var arr = await getClientList('важность', false);
    arr = arr.slice(arr.length % numberOfClient);
    var clients = arr.map(client => new Client({ ...client, type: 'sing', conf: conf.confJob.sign }));
    var helper = new Helper({ numberOfClient: numberOfClient, clients: clients });
    clients = await helper.getClients();
    if (clients) {
        var msg = [];
        clients.forEach((client, i) => {
            msg.push(`${i + 1}. ${client.login}`);
            socket.emit('on bot', client, client.conf);
        });
        msg = msg.join('\n');
        bot.sendMsgToAdmin(`Зашел для записи под:
${msg}`);
    } else {
        bot.sendMsgToAdmin("Произошла ошибка. Список клиентов для записи пуст.");
    }
}

socket.on('no time', async (client) => {
    // bot.sendPhotoToAdmin(path_to.time(client), `❌ В данный момент нет доступных мест для записи. Бот: ${client.login}`);
     bot.sendMsgToAdmin(`❌ В данный момент нет доступных мест для записи. Бот: ${client.login}`);
     switch (client.type) {
        case 'seach':
            await cycleSeach();
            break;
        default:
            break;
    }
});

socket.on('time', async (client, date) => {
    var msg = date.map(d => new Date(d.date).toLocaleDateString()).join('\n');
    bot.sendMsgToAdmin(`✅ Есть доступные места для записи. Даты:
${msg}
--------------
Бот: ${client.login}`);
   // bot.sendPhotoToAdmin(path_to.time(client), `✅ Есть доступные места для записи. Даты: ${msg}`);
    switch (client.type) {
        case 'seach':
            await cycleSeach();
            break;
        default:
            break;
    }
});

socket.on('sing up', (client) => {
    bot.sendMsgToAdmin(`✅ Успешная запись на собеседование. Бот: ${client.login}`);
});

socket.on('no sing up', (client) => {
    bot.sendMsgToAdmin(`❗️ Не подошли даты для записи. Бот: ${client.login}`);
});

socket.on('error auth', async (client) => {
    bot.sendMsgToAdmin(`❌ **Ошибка авторизации**
${client.error}
Бот: ${client.login}`);
    if (++client.failToAuth < 2) {
        return socket.emit('on bot', client, client.conf);
    }
    switch (client.type) {
        case 'seach':
            await cycleSeach();
            break;
        default:
            break;
    }
});

socket.on('error fill', async (client) => {
    bot.sendPhotoToAdmin(path_to.fill(client), `❌ Ошибка заполнения формы. Бот: ${client.login}`);
    switch (client.type) {
        case 'seach':
            await cycleSeach();
            break;
        default:
            break;
    }
});

socket.on('error sing', (client) => {
    bot.sendPhotoToAdmin(path_to.time(client, '_err'), `❌ Ошибка записи. Бот: ${client.login}`);
});

bot.launch()