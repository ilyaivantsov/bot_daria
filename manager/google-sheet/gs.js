const gs = require('google-spreadsheet');
const { promisify } = require('util');
const path = require('path');

/**
 * 
 * @param {JSON} conf
 * @returns {Class} GoogleTable build - для создания объекта класса
 */
function getGoogleSpredSheet(conf) {
    class GoogleTable {
        constructor(sh) {
            if (typeof sh === 'undefined') {
                throw new Error('Ошибка подключения к таблице.');
            }
            this.sh = sh;
        }

        _prepareClients(arrOfClientsTbl) {
            return arrOfClientsTbl.map(client => {
                var [d_after, m_after, y_after] = client['последаты'].split('.'),
                    [d_before, m_before, y_before] = client['додаты'].split('.');
                return {
                    id: client['id'] - 1,
                    login: client['логин'],
                    password: client['пароль'],
                    afterDate: {
                        month: m_after - 1,
                        day: +d_after,
                        year: +y_after
                    },
                    beforeDate: {
                        month: m_before - 1,
                        day: +d_before,
                        year: +y_before
                    }
                }
            })
        }

        async getClientsForSeach() {
            let arrOfClientsTbl = await promisify(this.sh.getRows)({
                offset: 1,
                query: 'статус != "В работе" and статус != "Срочный"'
            });
            let clientsArrQue = this._prepareClients(arrOfClientsTbl);
            return clientsArrQue.map(client => new GoogleTable.Client({ ...client, type: 'seach', conf: conf.confJob.seach }));
        }

        async getClientsForNight() {
            let arrOfClientsTbl = await promisify(this.sh.getRows)({
                offset: 1,
                query: 'статус != "В работе" and статус != "Срочный"'
            });
            arrOfClientsTbl = arrOfClientsTbl.filter(client => client['люди'] == 1)
            let clientsArrQue = this._prepareClients(arrOfClientsTbl);
            return clientsArrQue.map(client => new GoogleTable.Client({ ...client, type: 'night', conf: conf.confJob.night }));
        }

        /**
         * 
         * @param {Array} date Массив объектов - {date: 'в миллисекундах', num: 'Индекс элемента даты в календаре'} 
         */
        async getClientsForSign(date) {
            let arrOfClientsTbl = await promisify(this.sh.getRows)({
                offset: 1,
                orderby: 'важность',
                reverse: true,
                query: 'статус != "В работе"'
            });
            let clientsArrQue = this._prepareClients(arrOfClientsTbl);
            clientsArrQue = clientsArrQue.filter((client) => {
                const currYear = new Date().getFullYear();
                const afterDate = new Date(currYear, client.afterDate.month, client.afterDate.day).getTime();
                const beforeDate = new Date(currYear, client.beforeDate.month, client.beforeDate.day).getTime();
                return date.some(ell => ell.date >= afterDate && ell.date <= beforeDate);
            });
            return clientsArrQue.map(client => new GoogleTable.Client({ ...client, type: 'sign', conf: conf.confJob.sign }));
        }

        /**
         * 
         * @param {Object} Инициализация GoogleTable { nameOfTable: 'Название вкладки таблицы'} 
         */
        static async build({ nameOfTable }) {
            const doc = new gs(conf.google_sheet.spreadsheet_id);
            await promisify(doc.useServiceAccountAuth)(conf.google_sheet.client_secret);
            const info = await promisify(doc.getInfo)();
            return new GoogleTable(info.worksheets.find(sh => sh.title == nameOfTable), conf);
        }
    }

    GoogleTable.Client = require(path.join(__dirname, '..', 'clients/Client'))(conf);
    return GoogleTable;
}

module.exports = getGoogleSpredSheet;

