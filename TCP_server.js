const net = require('net');
const express = require('express');

const frontendPort = 3000;
const backendPort = 9000;

let return_message = {
    "message": "hi",
};

let clients = {};

let id = 0;

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

            console.log("Client " + this.id + ": left");

        })

    }
}

const app = express()

app.get('/', (req, res) => {

    console.log("clientId: " + req.query["clientId"]);
    console.log("on: " + req.query["on"]);

    clients[String(req.query["clientId"])].conn.write(JSON.stringify({
        "on": req.query["on"],
    }) + "\n")

    res.send("<h1>Thanks for your input</h1> <br><br> <p>You hav now changed the state of client " + req.query["clientId"] + " to " + req.query["on"] + "</p>");

});

const server = net.createServer(conn => {

    // Happens every time a new connection is made
    console.log("Client " + id + ": connected");

    conn.write(JSON.stringify({
        "id": id,
    }) + "\n")

    let c = new Connection(conn, id)

    clients[String(id)] = c;

    id += 1;

});

server.listen(backendPort, () => {
    console.log("Backend open on port: " + backendPort);
});

app.listen(frontendPort, () => {
    console.log("Frontend app listening on port: " + frontendPort);
})