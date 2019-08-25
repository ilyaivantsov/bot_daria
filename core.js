#!/usr/bin/env node
process.env.TZ = 'Europe/Moscow';
const path = require('path');

const app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io')(server);
const conf = require(path.join(__dirname, '/conf.json'));
const log = require(path.join(__dirname, '/common/log'));
const { authorization, toFillOutFormsMsk, checkTimetable, toSignUp, toFillOutFormsVld, _logOut } = require(path.join(__dirname, '/core/main/mainFunctions'))(conf);

const puppeteer = conf.develop ? require('puppeteer') : require('puppeteer-core');


async function mainMskSeach(client, numOfReload = 8, delay = 40000, quickCycle = false) {
    var page, time, numOfUpdate = numOfReload;
    const browser = conf.develop ? await puppeteer.launch({ headless: false, args: [`--proxy-server=${client.proxy}`], slowMo: 10 }) : await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', args: [`--proxy-server=${client.proxy}`, '--lang=ru'], slowMo: 10 });

    if (quickCycle) {
        page = await authorization(client, browser);
        await page.goto('https://cgifederal.secure.force.com/scheduleappointment', { waitUntil: 'networkidle2' });
    }
    else {
        [page, time] = await checkTimetable(client, await toFillOutFormsMsk(client, await authorization(client, browser), browser), browser, numOfUpdate, delay);
    }

    while (!time && numOfUpdate-- > 1) {
        [page, time] = await checkTimetable(client, page, browser, numOfUpdate, delay);
    }

    if (!time.length) {
        await _logOut(page, browser);
        log(client, "Нет времени;");
        return { type: 1, data: [] };
    }

    return { type: 2, data: [browser, page, client, time] };
}

async function mainMskSign(browser, Page, client, numOfReload = 5) {
    var page = Page, numOfTry = numOfReload, time, flag;
    [page, time, flag] = await toSignUp(client, page, browser, numOfTry);

    while (flag && numOfTry-- > 1) {
        [page, time, flag] = await toSignUp(client, page, browser, numOfTry);
    }

    if (page.url().split('?')[0] === 'https://cgifederal.secure.force.com/appointmentconfirmation') {
        log(client, `Успешно записался!!!`);
        await _logOut(page, browser);
        return { type: 3, data: time };
    }

    await _logOut(page, browser);
    return { type: 4, data: time };
}

io.on('connection', (socket) => {

    socket.on('on bot', async (client, conf = { numOfReload: undefined, delay: undefined, numOfTry: undefined, quickCycle: undefined }) => {
        try {
            var { type, data } = await mainMskSeach(client, conf.numOfReload, conf.delay, conf.quickCycle);
            if (type == 1) {
                socket.emit('no time', client);
            }
            if (type == 2) {
                socket.emit('time', client, data[3]);
                var ans = await mainMskSign(data[0], data[1], data[2], conf.numOfTry);
                switch (ans.type) {
                    case 3:
                        socket.emit('sing up', client);
                        break;
                    case 4:
                        socket.emit('no sing up', client);
                        break;
                    default:
                        socket.emit('end program', client);
                }
            }
        }
        catch (err) {
            switch (err.type) {
                case 1:
                    console.log(err.msg);
                    socket.emit('error auth', client);
                    break;
                case 2:
                    console.log(err.msg);
                    socket.emit('error fill', client);
                    break;
                case 3:
                    console.log(err.msg);
                    socket.emit('error timetable', client);
                    break;
                case 4:
                    console.log(err.msg);
                    socket.emit('error sing', client);
                    break;
                default:
                    console.log(err);
            }
        }
    })
});

server.listen(6481);