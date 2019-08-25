module.exports = (gs) => {
    return class {
        constructor({ numberOfClient, clients }) {
            this.clients = clients;
            this.currentClients = [];
            this.numberOfClient = numberOfClient;
        }
        async _setStatusForCurrentClients(status) {
            var { setCellStatus } = await gs;
            this.currentClients.forEach(client => setCellStatus(client.id, status).then(ans => {}));
        }
        async getClients() {
            if (!this.clients.length || this.clients.length % this.numberOfClient) {
                return false;
            }
            for (let i = 0; i < this.numberOfClient; i++) {
                this.currentClients.push(this.clients.pop());
            }
            await this._setStatusForCurrentClients('В работе');
            return this.currentClients;
        }
        async clearCurrentClient() {
            await this._setStatusForCurrentClients('');
            this.currentClients = [];
        }
    }
};  