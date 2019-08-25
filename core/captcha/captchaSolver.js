function solver(conf) {
    var anticaptcha = require('./antiicaptcha')(conf.captcha.api);

    return function (base64Img) {
        return new Promise((resolve, reject) => {
            anticaptcha.getBalance(function (err, balance) {
                if (err) {
                    reject({ msg: 'Low money', type: 64 });
                }
                anticaptcha.setMinLength(5);
                if (balance > 0) {
                    anticaptcha.createImageToTextTask({
                        case: true, // or params can be set for every captcha specially
                        body: base64Img.slice(18) // cut data:image;base64, info
                    },
                        function (err, taskId) {
                            if (err) {
                                reject({ msg: 'Error Id captcha', type: 64 });
                            }

                            anticaptcha.getTaskSolution(taskId, function (err, taskSolution) {
                                if (err) {
                                    reject({ msg: 'Error Task captcha', type: 64 });
                                }

                                resolve(taskSolution);
                            });
                        });
                }
            });
        });
    }
}
/**
 * 
 * @param {string} base64Img 
 */
module.exports = solver;
