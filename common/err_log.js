module.exports = (err, client = { login: 'System' }) => {
    return console.error(`${client.login} ${new Date().toLocaleTimeString()} :-->  
${err}
----------
`);
};