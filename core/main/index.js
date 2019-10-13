const path = require('path');

function index(conf) {
    const puppeteer = conf.develop ? require('puppeteer') : require('puppeteer-core');
    const log = require(path.join(__dirname, '..', '..', '/common/log'));
    const path_to = require(path.join(__dirname, '..', '..', '/common/path_to'));
    const { authorization, toFillOutFormsMsk, toFillOutFormsEkat, checkTimetable, toSignUp, _logOut } = require(path.join(__dirname, '..', '/brain/mainFunctions'))(conf);

    async function mainSeach(client) {
        var launchOptions = {
            headless: !conf.develop,
            args: [`--proxy-server=${client.proxy}`, '--lang=ru'],
            slowMo: 10,
            executablePath: conf.develop ? puppeteer.executablePath() : '/usr/bin/chromium-browser'
        };
        const browser = await puppeteer.launch(launchOptions);
        var date = null;
        var page = await authorization(client, browser);

        if (client.conf.quickCycle) {
            await page.goto('https://cgifederal.secure.force.com/scheduleappointment');
        }
        else {
            if (client.city == 'Msk') {
                [page, date] = await checkTimetable(client, await toFillOutFormsMsk(client, page, browser), browser);
            }
            else if (client.city == 'Ekat') {
                [page, date] = await checkTimetable(client, await toFillOutFormsEkat(client, page, browser), browser);
            }
        }

        while (!date && client.conf.numOfReload-- > 1) {
            [page, date] = await checkTimetable(client, page, browser);
        }

        if (!date.length) {
            await _logOut(page, browser);
            log(client, "Нет времени;");
            return { type: 1, data: {} };
        }

        return { type: 2, data: { browser: browser, page: page, client: client, date: date } };
    }

    async function mainSign({ browser, page, client }, socket) {

        var flag = false;

        async function listener() {
            let URL = page.url().split('?')[0];

            if (URL == 'https://cgifederal.secure.force.com/appointmentconfirmation') {
                await page.screenshot({ path: path_to.time(client, '_time'), fullPage: true });
                page.removeListener('domcontentloaded', listener);
                await _logOut(page, browser);
                log(client, "Успешно записался!!!");
                socket.emit('sign up', client);
            }
            else if (flag && client.conf.numOfTry > 1) {
                [page, flag] = await toSignUp(client, page);
                if (!flag) {
                    page.removeListener('domcontentloaded', listener);
                    await _logOut(page, browser);
                    log(client, "Конец программы!");
                    socket.emit('no sign up', client);
                }
            }
            else {
                await page.screenshot({ path: path_to.time(client, '_err'), fullPage: true });
                page.removeListener('domcontentloaded', listener);
                await _logOut(page, browser);
                log(client, "Конец программы!");
                socket.emit('no sign up', client);
            }
        }

        page.on('domcontentloaded', listener);

        [page, flag] = await toSignUp(client, page);

        if (!flag) {
            page.removeListener('domcontentloaded', listener);
            await _logOut(page, browser);
            log(client, "Конец программы!");
            socket.emit('no sign up', client);
        }
    }

    return { mainSeach: mainSeach, mainSign: mainSign }
}

module.exports = index;
