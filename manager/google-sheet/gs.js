const gs = require('google-spreadsheet');
const { promisify } = require('util');

/**
 * 
 * @param {JSON} conf 
 *  @returns {Object} {getClientList,setCellStatus}
 */
async function getGoogleSpred(conf) {
    /**
     * 
     * @param {String} nameOfTable 
     * @returns {Object} SpreadsheetWorksheet object
     */
    async function _accessSpred(nameOfTable = 'j') {
        try {
            const doc = new gs(conf.google_sheet.spreadsheet_id);
            await promisify(doc.useServiceAccountAuth)(conf.google_sheet.client_secret);
            const info = await promisify(doc.getInfo)();
            return info.worksheets.find(sh => sh.title == nameOfTable);
        }
        catch (err) {
            console.log(err);
            throw ({ type: 1 });
        }
    }

    /**
     * 
     * @param {Object} sh 
     */
    async function _getClientList(sh) {
        /**
         * 
         * @param {String} orderby Название столбца lowcase для ранжирования ботов. Default - без ранжирования
         * @param {Boolean} reverse Ранжировать true - в порядке убывания, false - в порядке возрастания. Default - true
         * @param {Number} limit Количество клиентов. Default - весь список
         * @param {Boolean} night Ночной список. Default - false
         * @returns {Array} Clients для коструктора
         */
        async function getClientList(orderby = false, reverse = true, limit = false, night = false) {
            try {
                let clients = await promisify(sh.getRows)({
                    offset: 1,
                    orderby: orderby,
                    reverse: reverse,
                    limit: limit,
                    query: 'статус != "В работе"'
                });
                if (night) clients = clients.filter(client => client['люди'] == 1)
                return clients.map(client => {
                    var [d_after, m_after, y_after] = client['последаты'].split('.'),
                        [d_before, m_before, y_before] = client['додаты'].split('.');
                    return {
                        id: client['id'] - 1,
                        login: client['логин'],
                        password: client['пароль'],
                        afterDate: {
                            month: m_after - 1,
                            day: +d_after
                        },
                        beforeDate: {
                            month: m_before - 1,
                            day: +d_before
                        }
                    }
                })
            }
            catch (err) {
                console.log(err);
                throw ({ type: 2 });
            }
        }
        return getClientList;
    }

    /**
     * 
     * @param {Object} sh
     */
    async function _setCellStatus(sh) {
        /**
         * 
         * @param {Number} numOfClient Номер клиента с 0
         * @param {String} status Статус клиента
         */
        async function setCellStatus(numOfClient, status = '') {
            try {
                const cell = await promisify(sh.getCells)({
                    'min-row': numOfClient + 2,
                    'max-row': numOfClient + 2,
                    'min-col': 8,
                    'max-col': 8,
                    'return-empty': true
                });
                cell[0].value = status;
                cell[0].save();
            }
            catch (err) {
                console.log(err);
                throw ({ type: 3 });
            }
        }
        return setCellStatus;
    }

    var sh = await _accessSpred(conf.google_sheet.nameOfTable);
    return {
        getClientList: await _getClientList(sh),
        setCellStatus: await _setCellStatus(sh)
    }
}

module.exports = getGoogleSpred;