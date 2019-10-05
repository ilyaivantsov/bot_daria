module.exports = main;
/**
 * Коды ошибок {type}:
 * 1 - Ошибка авторизации
 * 2 - Ошибка заполнения формы
 * 3 - Ошибка поиска времени
 * 4 - Ошибка записи
 */
function main(conf) {
    const path = require('path');
    const devices = conf.develop ? require('puppeteer/DeviceDescriptors') : require('puppeteer-core/DeviceDescriptors');
    const anticaptcha = require(path.join(__dirname, '..', '/captcha/captchaSolver'))(conf);
    const path_to = require(path.join(__dirname, '..', '..', '/common/path_to'));
    const log = require(path.join(__dirname, '..', '..', '/common/log'));
    const errLog = require(path.join(__dirname, '..', '..', '/common/err_log'));
    const currYear = 2020;//new Date().getFullYear();

    async function _setBrowserSettings(client, browser) {
        try {
            const page = await browser.newPage();
            // Proxy auth
            await page.authenticate(client.proxy_auth);
            await page.emulate(devices[client.device]);
            return page;
        }
        catch (err) {
            await browser.close();
            errLog(err, client);
        }
    }

    async function _logOut(page, browser) {
        try {
            await page.goto('https://cgifederal.secure.force.com/secur/logout.jsp', { waitUntil: 'networkidle2' });
            await page.waitFor(1000);
            await browser.close();
            return 0;
        }
        catch (err) {
            errLog(err);
        }
    }

    /**
     * 
     * @param {Object} page
     * @resolve {Array} Array of {date:Date.getTime(),num:NumberOfDate} || []
     * @reject {Error} validation error, connection error
     */
    async function _checkTimetable(page) {
        var time = await page.evaluate((currYear) => {
            var date = [];
            var timeTable = document.querySelectorAll('td[onclick]');
            timeTable.forEach((elm, index) => {
                var month = elm.closest('.ui-datepicker-group').querySelector('.ui-datepicker-month').textContent.toLowerCase();
                date.push({ date: new Date(currYear, _getNumOfMounth(month), +elm.textContent).getTime(), num: index });
            });
            function _getNumOfMounth(mon) {
                var s = '';
                switch (mon) {
                    case "январь": s = 0; break;
                    case "февраль": s = 1; break;
                    case "март": s = 2; break;
                    case "апрель": s = 3; break;
                    case "май": s = 4; break;
                    case "июнь": s = 5; break;
                    case "июль": s = 6; break;
                    case "август": s = 7; break;
                    case "сентябрь": s = 8; break;
                    case "октябрь": s = 9; break;
                    case "ноябрь": s = 10; break;
                    case "декабрь": s = 11; break;
                }
                return s;
            }
            return date;
        }, currYear);
        return time;
    }

    /**
     * 
     * @param {Object} page 
     * @param {Object} client
     * @resolve {Array} Array of {date:Date.getTime(),num:NumberOfDate} || [] Only for Client
     * @reject {Error} validation error, connection error
     */
    async function _checkTimetableForClient(page, client) {
        var time = await _checkTimetable(page);
        function filterDate(time, client) {
            var avlDate = time;
            // Not date
            client.notDate.forEach(date => {
                avlDate = avlDate.filter(elm => elm.date != new Date(currYear, date.month, date.day).getTime());
            });
            avlDate = avlDate.filter(elm => elm.date >= new Date(currYear, client.afterDate.month, client.afterDate.day).getTime());
            avlDate = avlDate.filter(elm => elm.date <= new Date(currYear, client.beforeDate.month, client.beforeDate.day).getTime());
            // return avlDate.map(elm => elm.num);
            return avlDate;
        }
        if (!time.length) return [];
        return filterDate(time, client);
    }

    async function authorization(client, browser, url = 'https://cgifederal.secure.force.com/') {
        log(client, "Начало работы ...");
        try {
            const page = await _setBrowserSettings(client, browser);
            await page.goto(url);
            await page.waitForSelector('img[xmlns]');
            const [login, capcha] = await page.$$('input[type="text"]');
            const password = await page.$('input[type="password"]');
            const checkbox = await page.$('input[type="checkbox"]');
            const base64ImgCaptcha = await page.evaluate(() => document.querySelector('img').src);
            await checkbox.click();
            // Input auth information
            await login.type(client.login);
            await password.type(client.password);
            await capcha.type(await anticaptcha(base64ImgCaptcha));
            // Auth and Check status
            await Promise.all([
                page.waitForNavigation(),
                page.click('input[type="submit"]'),
            ]);
            await page.waitFor(6000);
            var URL = page.url().split('?')[0];
            // Status
            if (URL == 'https://cgifederal.secure.force.com/applicanthome') {
                log(client, "Успешная авторизация!");
                return page;
            }
            if (URL == 'https://cgifederal.secure.force.com/SiteLogin') {
                log(client, "Ошибка авторизации");
                client.error = await page.evaluate(() => document.querySelector('.errorM3').textContent.replace(/^\s*/, '').replace(/\s*$/, ''));
            }
            if (URL == 'https://cgifederal.secure.force.com/_ui/system/security/ChangePassword') {
                log(client, "Смена пароля");
                client.error = "Необходимо сменить пароль";
            }
            throw ({ type: 1 });
        }
        catch (err) {
            await browser.close();
            if (err.type != 1) {
                errLog(err, client);
            }
            throw ({ type: 1 });
        }
    }

    async function toFillOutFormsMsk(client, page, browser) {
        try {
            var nextSteps, ansArr;
            // Step 1.
            const buttonApply = await page.$('.current');
            await buttonApply.click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 2.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[0].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 3.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[0].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 4.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[2].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 5.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[1].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 6.
            nextSteps = await page.$('input[type="button"]');
            await nextSteps.click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 7.
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 8.
            nextSteps = await page.$$('input[type="submit"]'); // No. Belrus
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('input[type="submit"]');
            // Step 9. 
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('button');
            // Step 10.
            const submitInfoFromModalWindow = await page.$('button');
            await submitInfoFromModalWindow.click();
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 11. Calendar
            return page;
        }
        catch (err) {
            errLog(err, client);
            await page.screenshot({ path: path_to.fill(client), fullPage: true });
            await _logOut(page, browser);
            throw ({ type: 2 });
        }
    }

    async function toFillOutFormsVld(client, page, browser) {
        try {
            var nextSteps, ansArr;
            // Step 1.
            const buttonApply = await page.$('.current');
            await buttonApply.click();
            await page.waitForNavigation();
            // Step 2.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[0].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 3.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[3].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 4.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[1].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 5.
            nextSteps = await page.$$('input[type="submit"]');
            ansArr = await page.$$('input[type="radio"]');
            await ansArr[1].click();
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 6.
            nextSteps = await page.$('input[type="button"]');
            await nextSteps.click();
            await page.waitForNavigation();
            // Step 7.
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 8.
            nextSteps = await page.$$('input[type="submit"]'); // No. Belrus
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 9. 
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            await page.waitForSelector('button'); // Wait for modal window
            // Step 10.
            const submitInfoFromModalWindow = await page.$('button');
            await submitInfoFromModalWindow.click();
            nextSteps = await page.$$('input[type="submit"]');
            await nextSteps[1].click();
            await page.waitForNavigation();
            // Step 11. Calendar
            return page;
        }
        catch (err) {
            errLog(err, client);
            await page.screenshot({ path: path_to.fill(client), fullPage: true });
            await _logOut(page, browser);
            throw ({ type: 2 });
        }
    }

    /**
     * 
     * @param {Object} client 
     * @param {Object} page 
     * @param {Object} browser 
     * @returns {Array} [page,date || false]
     */
    async function checkTimetable(client, page, browser) {
        log(client, `Обновление времени ${client.conf.numOfReload}`);
        try {
            const timeTable = await page.$$('td[onclick]');
            if (!timeTable.length) {
                await page.waitFor(client.conf.delay);
                await page.reload();
                return [page, false];
            }
            log(client, "Нашел время!!!");
            var date = await _checkTimetable(page);
            return [page, date];
        }
        catch (err) {
            errLog(err, client);
            await page.screenshot({ path: path_to.time(client, '_err'), fullPage: true });
            await _logOut(page, browser);
            throw ({ type: 3 });
        }
    }

    /**
     * 
     * @param {Object} client 
     * @param {Object} page 
     * @returns {Array} [page,true/false] - true - continue, false - stop 
     */
    async function toSignUp(client, page) {
        const scheduleURL = 'https://cgifederal.secure.force.com/scheduleappointment';
        try {
            if (page.url().split('?')[0] != scheduleURL) {
                await page.goto(scheduleURL);
            }
            client.conf.numOfTry--;

            const timeTable = await page.$$('td[onclick]');

            if (!timeTable.length) {
                log(client, 'Закончились места');
                return [page, false];
            }

            var avlDateForClient = await _checkTimetableForClient(page, client);

            if (!avlDateForClient.length) {
                log(client, 'Нет подходящих мест для записи');
                return [page, false];
            }

            var num = avlDateForClient.map(elm => elm.num);

            await timeTable[num[Math.floor(Math.random() * num.length)]].click();
            await page.waitFor(3000);
            const selectDate = await page.$$('input[type="checkbox"]');
            await selectDate[Math.floor(Math.random() * selectDate.length)].click();
            // const submit = await page.$('input[type="button"]');
            // await submit.click();

            log(client, `Попытка записи ${client.conf.numOfTry}`);
            return [page, true];
        }
        catch (err) {
            errLog(err, client);
            await page.goto(scheduleURL);
            return [page, true];            
        }
    }

    return { authorization, toFillOutFormsMsk, checkTimetable, toFillOutFormsVld, toSignUp, _logOut };
}