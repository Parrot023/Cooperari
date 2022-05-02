const net = require('net');

let return_message = {
    "message": "hi",
};

const server = net.createServer(conn => {
    console.log("New client");

    conn.on('data', data => {
        console.log("Data recieved: ", data.toString());

        conn.write(JSON.stringify(return_message) + "\n");

        console.log("Sending back: ", JSON.stringify(return_message) + "\n");

    });

    conn.on('end', () => {
        console.log("client left");
    })
});

server.listen(9000);