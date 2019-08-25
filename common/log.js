module.exports = (client, msg) => {
    return console.log(`${client.login} ${new Date().toLocaleTimeString()} :-->  ${msg};`);
};