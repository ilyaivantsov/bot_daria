var CronJob = require('cron').CronJob;

class Cycle {
    constructor({ socket, queue, numClients = 1, nameCycle = 'Seach', on = false }) {
        this.socket = socket;
        this.queue = queue;
        this.on = on;
        this.numClients = numClients;
        this.nameCycle = nameCycle;
        this.cronJob = null;
    }

    async tick() {
        if (!this.on) return `Для включения /turn_on`;
        var msg = `Зашел под:
`;
        for (var i = 0; i < this.numClients; i++) {
            let client = await this.queue.getClientFromQueue();
            if (!client) {
                break;
            }
            this.socket.emit('on bot', client);
            msg += `${i + 1}) ${client.login}
`;
        }
        return i == 0 ? `${this.nameCycle} очередь пустая.` : msg;
    }

    cronStart(scheme, bot) {
        this.cronJob = new CronJob(scheme, () => { this.tick().then(msg => bot.sendMsgToAdmin(msg)).catch(err => console.log(err)) }, null, true, 'America/Los_Angeles');
        this.cronJob.start();
    }
    cronStop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
    }
}

module.exports = Cycle;