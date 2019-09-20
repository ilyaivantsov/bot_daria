var path = require('path');
var path_to = require(path.join(__dirname, '..', '..', '/common/path_to'));

function socketHandler({ socket, bot, cycleSeach, queueSign, queueSigned, gs }) {

    socket.on('no time', (client) => {
        bot.sendMsgToAdmin(`❌ В данный момент нет доступных мест для записи. Бот: ${client.login}`);
        if (client.type == 'seach') {
            cycleSeach.tick()
                .then(msg => bot.sendMsgToAdmin(msg))
                .catch(err => console.log(err));
        }
    })

    socket.on('time', (client, date) => {
        var msg = date.map(d => new Date(d.date).toLocaleDateString()).join('\n');
        bot.sendMsgToAdmin(`✅ Есть доступные места для записи. Даты:
${msg}
--------------
Бот: ${client.login}`);
        if (client.type == 'seach') {
            queueSign.numOfClients()
                .then(num => num == 0 ? gs.getClientsForSign(date) : 0)
                .then(clients => queueSign.generateQueue(clients))
                .then(() => bot.sendMsgToAdmin("Очередь для записи создана. Для запуска /turn_on"))
                .catch(err => console.log(err));
        }
    });

    socket.on('sign up', (client) => {
        queueSigned.generateQueue([client]).catch(err => console.log(err));
        bot.sendMsgToAdmin(`✅ Успешная запись на собеседование. Бот: ${client.login}`);
    });

    socket.on('no sign up', (client) => {
        bot.sendMsgToAdmin(`❗️ Не подошли даты для записи. Бот: ${client.login}`);
    });

    socket.on('error auth', (client) => {
        bot.sendMsgToAdmin(`❌ **Ошибка авторизации**
${client.error}
Бот: ${client.login}`);

        if (++client.failToAuth < 2) {
            socket.emit('on bot', client);
            return 0;
        }

        if (client.type == 'seach') {
            cycleSeach.tick()
                .then(msg => bot.sendMsgToAdmin(msg))
                .catch(err => console.log(err));
        }
    });

    socket.on('error fill', (client) => {
        bot.sendPhotoToAdmin(path_to.fill(client), `❌ Ошибка заполнения формы. Бот: ${client.login}`);

        if (client.type == 'seach') {
            cycleSeach.tick()
                .then(msg => bot.sendMsgToAdmin(msg))
                .catch(err => console.log(err));
        }
    });

    socket.on('error timetable', (client) => {
        bot.sendPhotoToAdmin(path_to.time(client, '_err'), `❌ Ошибка обновления таблицы. Бот: ${client.login}`);
        if (client.type == 'seach') {
            cycleSeach.tick()
                .then(msg => bot.sendMsgToAdmin(msg))
                .catch(err => console.log(err));
        }
    })

    socket.on('error sign', (client) => {
        bot.sendPhotoToAdmin(path_to.time(client, '_err'), `❌ Ошибка записи. Бот: ${client.login}`);
    });
}

module.exports = socketHandler;