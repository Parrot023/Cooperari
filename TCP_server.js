// PLAN

// CODE THE PROCESS THAT HAPPENS EVERY TIME A CLIENT CONNECTS
    // Client connects
    // Server sends back response {"status":"idUnknown"}
    // Client sends a json object containing a client id and the user id of the user that owns it and its status
    // Server checks if the id is known to the server
        // If known
        // Status of client will be {"status": "reconnecting"}
        // The user id from the client is checked to see if it matches the user id known to own the client
            // If correct
            // Connection established server sends back {"status": "idConfirmed"}
        // If not known
        // In this case the user will have just know set up the device as the next step for the device will be to connect to the server
        // Status of device will now be {"status":"initialConnection"}
        // A new client will be added to the database and assigned the user id of the user that did the setup before the client started the initialConnection with the server
        // Server sends back {"status": "initialConnectionComplete"}
    // Client is added to the json object of currently connected clients and assigned a name corresponding to the client id

// Set up database
    // Table of devices known to the server
    // Every device will be assigned a user id
    // Table of users known to the server

// Http route of frontend client asking for a users devices
    // At this point the frontend will have handled the sign of the user and will be asking for the users devices
    // All devices assigned the user of the frontends id must be found and sent to the frontend

// Set up http route to change a devices states
    // Frontend will have received data about the devices connected to the user
    // The user will be able to control the device
    // As soon as the user changes the state of a device a message should be sent to the server
    // The server stores the new state in the data and sends the new state to the device
    // The state stored in the database asures that the data about the device can be read even when the device is offline

// Device must be able to sent sensor data back to the server
// Every bit of data sent between the server and the client must be assigned a function name like:
    // {"function": "changeOfState"}, {"function": "dataRecieved"}, {"function": "sensorData"}
    // This will tell each side why the bit of data was sent from the other side

// When all this is done is believe we will have a stable backed foundation for any IOT project

const net = require('net');
const express = require('express');
const tools = require('./tools');

const frontendPort = 3000;
const backendPort = 9000;

let DBconn = tools.connectToSqlServer();

let clients = {};

let device_count = 2;

const app = express()

tools.setDB(DBconn, 'test_db')



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

    // The first time the device connects its status will be un initialized
    
    // To initialize the client will tell the server what properties it has
    // these properties will have an initial value given by the connecting client.
    // The properties will be compared to the ones in the database if they match the device is added

    // A device is first a "known" device after having been initialized

    console.log("Client " + device_count + ": connected");

    conn.write(JSON.stringify({
        "Device count": device_count,
    }) + "\n")

    let c = new tools.Client(conn, DBconn, (id) => {

        // Device in database

        clients[String(id)] = c;

        console.log(clients)
    
    }, () => {
    
        // Device not in database

        clients[String(device_count)] = c;

        c.id = device_count;

        c.propertyChange({"deviceId": c.id});

        device_count ++;
    
    })

});

server.listen(backendPort, () => {
    console.log("Backend open on port: " + backendPort);
});

app.listen(frontendPort, () => {
    console.log("Frontend app listening on port: " + frontendPort);
})