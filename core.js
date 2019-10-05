#!/usr/bin/env node
process.env.TZ = 'Europe/Moscow';
const path = require('path');

const app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io')(server);
const conf = require(path.join(__dirname, '/conf.json'));
var { mainMskSeach, mainMskSign } = require(path.join(__dirname, '/core/main/index'))(conf);

io.on('connection', (socket) => {

    socket.on('on bot', async (client) => {
        try {
            var { type, data } = await mainMskSeach(client);
            if (type == 1) {
                socket.emit('no time', client);
            }
            if (type == 2) {
                socket.emit('time', client, data.date);
                await mainMskSign(data, socket);
            }
            return 0;
        }
        catch (err) {
            switch (err.type) {
                case 1:
                    socket.emit('error auth', client);
                    break;
                case 2:
                    socket.emit('error fill', client);
                    break;
                case 3:
                    socket.emit('error timetable', client);
                    break;
                case 4:
                    socket.emit('error sign', client);
                    break;
                default:
                    console.error(err);
            }
        }
    })
});

server.listen(6481);