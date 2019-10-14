module.exports = (conf) => {
    const deviceArr = ["iPhone 7", "iPhone X", "iPhone X landscape", "iPhone 8", "iPhone 6 Plus landscape", "iPhone 8 Plus"];
    const proxyArr = conf.proxyArr;

    return class {
        constructor({ login, password, proxy = null, city = "Msk", type = "seach", id = 0, proxy_auth = { username: 'iwww68_gmail_com', password: 'cde999c75e' }, afterDate = { month: 6, day: 16, year: 2019 }, beforeDate = { month: 10, day: 16, year: 2019 }, conf = { numOfReload: undefined, delay: undefined, numOfTry: undefined, quickCycle: undefined } }) {
            this.password = password;
            this.login = login;
            this.id = id;
            this.device = deviceArr[Math.floor(Math.random() * deviceArr.length)];
            this.proxy = proxy || proxyArr[Math.floor(Math.random() * proxyArr.length)];
            this.proxy_auth = proxy_auth;
            this.isApptAvlb = false;
            this.failToAuth = 0;
            this.notDate = [];
            this.afterDate = afterDate;
            this.beforeDate = beforeDate;
            this.dateToSign = false;
            this.conf = conf;
            this.error = '';
            this.city = city;
            this.type = type;
        }
    }

};