const path = require('path');

function index(conf) {
    const puppeteer = conf.develop ? require('puppeteer') : require('puppeteer-core');
    const log = require(path.join(__dirname, '..', '..', '/common/log'));
    const path_to = require(path.join(__dirname, '..', '..', '/common/path_to'));
    const { authorization, toFillOutFormsVld, checkTimetable, toSignUp, _logOut } = require(path.join(__dirname, '..', '/brain/mainFunctions'))(conf);

    async function mainMskSeach(client) {
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
            [page, date] = await checkTimetable(client, await toFillOutFormsVld(client, page, browser), browser);
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

    async function mainMskSign({ browser, page, client }, socket) {

        var [page, flag] = await toSignUp(client, page);

        if (page.url().split('?')[0] == 'https://cgifederal.secure.force.com/appointmentconfirmation') {
            await _logOut(page, browser);
            log(client, "Успешно записался!!!");
            socket.emit('sign up', client);
        }
        else if (!flag) {
            await _logOut(page, browser);
            socket.emit('no sign up', client);
        }
        else {
            page.on('domcontentloaded', async function listener() {
                if (flag && client.conf.numOfTry > 1) {
                    [page, flag] = await toSignUp(client, page);
                }
                else if (page.url().split('?')[0] == 'https://cgifederal.secure.force.com/appointmentconfirmation') {
                    await page.screenshot({ path: path_to.time(client, '_time'), fullPage: true });
                    page.removeListener('domcontentloaded', listener);
                    await _logOut(page, browser);
                    log(client, "Успешно записался!!!");
                    socket.emit('sign up', client);
                }
                else {
                    page.removeListener('domcontentloaded', listener);
                    await _logOut(page, browser);
                    socket.emit('no sign up', client);
                }
            });
        }
    }

    return { mainMskSeach: mainMskSeach, mainMskSign: mainMskSign }
}

module.exports = index;
