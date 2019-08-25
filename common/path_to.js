var path = require('path');
var fs = require('fs');
const dirs = [path.join(__dirname, '..', '/screenshots'), path.join(__dirname, '..', '/screenshots/auth'), path.join(__dirname, '..', '/screenshots/fill'), path.join(__dirname, '..', '/screenshots/time')];

dirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
    } catch (err) {
        console.error(err)
    }
});

var path_to = {
    authorization: (client, info = '') => path.join(__dirname, '..', `/screenshots/auth/${client.login + info}.png`),
    fill: (client, info = '') => path.join(__dirname, '..', `/screenshots/fill/${client.login + info}.png`),
    time: (client, info = '') => path.join(__dirname, '..', `/screenshots/time/${client.login + info}.png`)
}

module.exports = path_to;

