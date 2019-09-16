const AWS = require('aws-sdk');

function getQueue(conf) {
    AWS.config.update({
        region: conf.queue.region,
        accessKeyId: conf.queue.accessKeyId,
        secretAccessKey: conf.queue.secretAccessKey
    });

    class Queue {
        /**
         * 
         * @param {Object} {URL:'URL очереди'} 
         */
        constructor({ URL }) {
            this.URL = URL;
            this.sqs = new AWS.SQS();
        }

        /**
         * 
         * @param {Array} clients Массив клиентов из GoogleTable 
         */
        async generateQueue(clients) {
            for (let i = 0; i < clients.length; i++) {
                let params = {
                    QueueUrl: this.URL,
                    MessageGroupId: "embassy",
                    MessageDeduplicationId: clients[i].login,
                    MessageBody: JSON.stringify(clients[i])
                };
                await this.sqs.sendMessage(params).promise()
                    .then(data => {
                        console.log("Success", data.MessageId);
                    })
                    .catch(err => {
                        console.log("Error", err);
                    });
            }
        }

        clearQueue() {
            let params = {
                QueueUrl: this.URL
            };
            this.sqs.purgeQueue(params, function (err, data) {
                if (err) console.log(err, err.stack);
                else console.log(data);
            })
        }

        async getClientFromQueue() {
            let params = {
                QueueUrl: this.URL
            };

            let res = await this.sqs.receiveMessage(params).promise()
                .then((data) => { return { client: JSON.parse(data.Messages[0].Body), ReceiptHandle: data.Messages[0].ReceiptHandle } })
                .catch(err => console.log("Receive Error", err));

            let deleteParams = {
                QueueUrl: this.URL,
                ReceiptHandle: res.ReceiptHandle
            };

            await this.sqs.deleteMessage(deleteParams).promise()
                .then(data => console.log("Message Deleted", data))
                .catch(err => console.log("Delete Error", err));

            return res.client;
        }
    }
    return Queue;
}

module.exports = getQueue;

