const path = require('path');
const fs = require('fs');
const { keyboardON, keyboardOFF, queueCreate, queueClear } = require(path.join(__dirname, '..', '/keyboards/mainKeyboard'));

function turnOnBot({ reply }) {
    reply('Какого бота включить? Выберите 👇🏻',
        keyboardON
            .oneTime()
            .resize()
            .extra()
    );
    return 0;
}

function turnOffBot({ reply }) {
    reply('Какого бота выключить? Выберите 👇🏻',
        keyboardOFF
            .oneTime()
            .resize()
            .extra()
    )
    return 0;
}

function queueCreateBot({ reply }) {
    reply('Какую очередь создать? Выберите 👇🏻',
        queueCreate
            .oneTime()
            .resize()
            .extra()
    )
    return 0;
}

function queueClearBot({ reply }) {
    reply('Какую очередь очистить? Выберите 👇🏻',
        queueClear
            .oneTime()
            .resize()
            .extra()
    )
    return 0;
}

function showLog(ctx) {
    ctx.telegram.sendDocument(ctx.from.id, {
        source: fs.createReadStream(path.join(__dirname, '..', '..', '..', 'log.txt')),
        filename: `log.txt`
    });
    return 0;
}

function sendPhotoToAdmin(path_to, msg) {
    this.telegram.sendPhoto(this.arrOfAdmin[0], {
        source: fs.createReadStream(path_to)
    }).then(ans => {
        this.arrOfAdmin.forEach((id) => {
            this.telegram.sendPhoto(id, ans.photo[ans.photo.length - 1].file_id, {
                caption: msg
            })
        });
    });
    return 0;
}

function sendMsgToAdmin(msg) {
    this.arrOfAdmin.forEach((id) => { this.telegram.sendMessage(id, msg) });
    return 0;
}

module.exports = {
    turnOnBot: turnOnBot,
    turnOffBot: turnOffBot,
    queueCreateBot: queueCreateBot,
    queueClearBot: queueClearBot,
    showLog: showLog,
    sendPhotoToAdmin: sendPhotoToAdmin,
    sendMsgToAdmin: sendMsgToAdmin
}
