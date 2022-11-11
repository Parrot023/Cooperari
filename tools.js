

let return_message = {
    "message": "hi",
};

function Client(conn, id) {

    this.conn = conn;
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

module.exports = {
    Client: Client
}