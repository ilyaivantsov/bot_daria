function solverRu(conf) {
    var buf = require('buffer'),
        Recognize = require('./recognize'),
        recognize = new Recognize('rucaptcha', {
            key: conf.captcha.api_ru
        });
    return function (base64Img) {
        return new Promise((resolve, reject) => {
            try {
                recognize.balanse(function (price) {
                    if (+price < 0.5) {
                        return reject("Low money(");
                    }
                });

                recognize.solving(buf.Buffer.from(base64Img.slice(18), 'base64'), function (err, id, code) {
                    if (err) reject(err);
                    if (code) resolve(code);
                    else {
                        console.log('Captcha not valid');
                        recognize.report(id, function (err, answer) {
                            console.log(answer);
                        });
                    }
                });
            }
            catch (err) {
                reject({ msg: err });
            }
        });
    }
}

module.exports = solverRu;