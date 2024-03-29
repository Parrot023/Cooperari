
// net is for the TCP connection between the device and the server
const net = require('net');
// express is for the HTTP connection between the client and the server
const express = require('express');
// tools is library that helps with the communication between the client and the server
const tools = require('./tools');
const { Console } = require('console');
const device = require('./device');
// The object used to communicate with a device (Each connected device is an instance of this function object)
const Device = require('./device').Device;


const frontendPort = 3000;
const backendPort = 9000;

// List of tables
// This list defines what devices there are and what there properties are
// Upon every server bootup this list is compared to the existing tables. 
// If the table doesn't exist it is create
// If the table exists but the values are incorrect the values are corrected
const tables = [
    ["switch", [
        ["deviceId", "VARCHAR(255)"],
        ["userId", "VARCHAR(255)"],
        ["deviceName", "VARCHAR(255)"],
        ["state", "VARCHAR(255)"],
    ]], 
    ["pot", [
        ["deviceId", "VARCHAR(255)"],
        ["userId", "VARCHAR(255)"],
        ["deviceName", "VARCHAR(255)"],
        ["ledState", "VARCHAR(255)"],
        ["sensorValue", "VARCHAR(255)"],
        ["pumpState", "VARCHAR(255)"],
    ]], 
];

// Creates the mysql connection to the server
let DBconn = tools.connectToSqlServer();

// List of connected devices
let devices = {};

// If a device has not been connected to the server before it will receive and id
// This id is for know just a number corresponds to the number of known devices
let device_count = 2;

// Express app for frontend
const app = express()
// Requiring the routes for the express server
require('./routes')(app, devices, tools, DBconn);

// Setting the used database to test_db (in sql syntax - USE test_db)
tools.setDB(DBconn, 'test_db')

tools.correctTables(DBconn, tables);

const server = net.createServer(conn => {

    // Happens every time a new connection is made

    // The first time the device connects, its status will be uninitialized
    
    // To initialize the client will tell the server what properties it has
    // these properties will have an initial value given by the connecting client.
    // The properties will be compared to the ones in the database if they match the device is added

    // A device is first a "known" device after having been initialized

    console.log("TCP_server.js - A new device started a handshake #" + device_count);

    // Initial message to the device. This should start the handshake with the device
    conn.write(JSON.stringify({
        "status":"idUnknown",
    }) + "\n")

    let d = new Device(conn, DBconn, (id) => {

        // This callback is called if the device is found in the database

        devices[String(id)] = d;

        console.log("TCP_server.js/new Device - List of connected devices:" + devices)
    
    }, () => {
    
        // This callback is called if the device is not found in the database

        console.log("TCP_server.js/new Device - The device was not found in the database")

        console.log("TCP_server.js/new Device - Object of new device" + d);

        // The device is added to the JSON object of connected devices with the key device_count
        devices[String(device_count)] = d;

        console.log("TCP_server.js/new Device - List of connected devices:" + devices);

        // This is not needed the new id can just be an input to the funciton propertyChange
        // Thats how it should be. Like statechange in React
        d.id = device_count; // Should be removed in future development

        //for future developement - c.propertyChange({"deviceId": device_count});
        d.propertyChange({"deviceId": d.id});

        device_count ++;
    
    }, (id) => {

        // This callback is called when the device disconnects from the server

        if (devices[id]) {

            // If the devices completed a handshake with the server
            
            console.log("TCP_server.js/new Device - Device", id, ": Disconnected");
            delete devices[id];

        } else {

            // Would be nice to have a handshake id to identify the uncompleted handshake
            console.log("TCP_server.js/new Device - A device disconnected before completing a handshake")
        
        }


    })

});

// Starts the servers
server.listen(backendPort, () => {
    console.log("Backend open on port: " + backendPort);
});

app.listen(frontendPort, () => {
    console.log("Frontend app listening on port: " + frontendPort);
})