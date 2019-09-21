const path = require('path');

function index(conf) {
    const puppeteer = conf.develop ? require('puppeteer') : require('puppeteer-core');
    const log = require(path.join(__dirname, '..', '..', '/common/log'));
    const { authorization, toFillOutFormsMsk, checkTimetable, toSignUp, _logOut } = require(path.join(__dirname, '..', '/brain/mainFunctions'))(conf);

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
            [page, date] = await checkTimetable(client, await toFillOutFormsMsk(client, page, browser), browser);
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

    async function mainMskSign({ browser, page, client }) {
        try {
            var flag = true, sign;

            while (flag && client.conf.numOfTry-- > 1) {
                [page, flag, sign] = await toSignUp(client, page);
            }

            if (sign) {
                log(client, "Успешно записался!!!");
                await _logOut(page, browser);
                return { type: 1 };
            }

            await _logOut(page, browser);
            return { type: 2 };
        }
        catch (err) {
            return mainMskSign({ browser: browser, page: err.page, client: client });
        }
    }

    return { mainMskSeach: mainMskSeach, mainMskSign: mainMskSign }
}

module.exports = index;
