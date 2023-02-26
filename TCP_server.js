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

// net is for the TCP connection between the device and the server
const net = require('net');
// express is for the HTTP connection between the client and the server
const express = require('express');
// tools is library that helps with the communication between the client and the server
const tools = require('./tools');
const { Console } = require('console');
// The object used to communicate with a device (Each connected device is an instance of this function object)
const Device = require('./device').Device;


const frontendPort = 3000;
const backendPort = 9000;

// Creates the mysql connection to the server
let DBconn = tools.connectToSqlServer();

// List of connected devices
let clients = {};

// If a device has not been connected to the server before it will receive and id
// This id is for know just a number corresponds to the number of known devices
let device_count = 2;

// Express app for frontend
const app = express()

// Setting the used database to test_db (in sql syntax - USE test_db)
tools.setDB(DBconn, 'test_db')

// Test route for sending data to a device
app.get('/', (req, res) => {

    console.log("User send data")
    console.log("clientId: " + req.query["clientId"]);
    console.log("on: " + req.query["on"]);

    // Sending the data to the device
    // This should in the future happen thorugh a function in the client object function
    clients[String(req.query["clientId"])].conn.write(JSON.stringify({
        "on": req.query["on"],
    }) + "\n")

    res.send("<h1>Thanks for your input</h1> <br><br> <p>You hav now changed the state of client " + req.query["clientId"] + " to " + req.query["on"] + "</p>");

});

const server = net.createServer(conn => {

    // Happens every time a new connection is made

    // The first time the device connects, its status will be uninitialized
    
    // To initialize the client will tell the server what properties it has
    // these properties will have an initial value given by the connecting client.
    // The properties will be compared to the ones in the database if they match the device is added

    // A device is first a "known" device after having been initialized

    console.log("A new device started a handshake #" + device_count);

    // Initial message to the device. This should start the handshake with the device
    conn.write(JSON.stringify({
        "status":"idUnknown",
    }) + "\n")

    let c = new Device(conn, DBconn, (id) => {

        // This callback is called if the device is found in the database

        clients[String(id)] = c;

        console.log(clients)
    
    }, () => {
    
        // This callback is called if the device is not found in the database

        // The device is added to the JSON object of connected devices with the key device_count
        clients[String(device_count)] = c;

        // This is not needed the new id can just be an input to the funciton propertyChange
        // Thats how it should be. Like statechange in React
        c.id = device_count; // Should be removed in future development

        //for future developement - c.propertyChange({"deviceId": device_count});
        c.propertyChange({"deviceId": c.id});

        device_count ++;
    
    }, (id) => {

        // This callback is called when the device disconnects from the server

        if (clients[id]) {

            // If the devices completed a handshake with the server
            
            console.log("Device", id, ": Disconnected");
            delete clients[id];

        } else {

            // Would be nice to have a handshake id to identify the uncompleted handshake
            console.log("A device disconnected before completing a handshake")
        
        }


    })

});

// Startes the servers
server.listen(backendPort, () => {
    console.log("Backend open on port: " + backendPort);
});

app.listen(frontendPort, () => {
    console.log("Frontend app listening on port: " + frontendPort);
})