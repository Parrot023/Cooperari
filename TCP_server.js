const net = require('net');

const server = net.createServer(conn => {
    console.log("New client");

    conn.on('data', data => {
        console.log("Data recieved: ", data.toString());

        conn.write("I hear you");

    });

    conn.on('end', () => {
        console.log("client left");
    })
});

server.listen(9000);