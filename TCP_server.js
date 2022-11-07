const net = require('net');

let return_message = {
    "message": "hi",
};

conns = {};

id = 0;

class Connection {
    constructor(conn, id) {
        this.conn = conn
        this.id = id;

        this.conn.on('data', data => {
            console.log("Data recieved from client " + this.id + ": ", data.toString());
    
            this.conn.write(JSON.stringify(return_message) + "\n");
    
            console.log("Sending back: ", JSON.stringify(return_message) + "\n");
    
        });
    
        this.conn.on('end', () => {
            console.log("Client " + this.id + " left");
        })

    }
}

const server = net.createServer(conn => {
    console.log("New client");

    let c = new Connection(conn, id)

    conns[id] = c;

    id += 1;

});

server.listen(9000);