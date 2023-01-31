const mysql = require('mysql2');
const fs = require('fs');
const { response } = require('express');
require('dotenv').config();


// CLIENT PART ----------------------------------------------------------

let return_message = {
    "message": "hi",
};

let deviceTypes = {
    "switch": [
        ["deviceType", "string"],
        ["deviceId", "number"],
        ["userId", "number"],
        ["deviceName", "string"],
        ["state", "number"]
    ]
}

// readFileSync stop the program from continuing before the data has been read
let rawResponses = fs.readFileSync('responses.json')

let responses = JSON.parse(rawResponses);

// Client object to handle the connection with the client
function Client(conn, DBconn, onIdentified, onInitialyzation) {

    this.conn = conn;
    this.id = undefined;

    this.identified = false;

    this.properties;

    this.evaluateRecievedData = function(data, allPMandatory) {

        let deviceType = data["properties"]["deviceType"];
        let requiredProperties = deviceTypes[deviceType]
        let correct = true;
        let insertedData = [];
        
        for (let i = 0; i < requiredProperties.length; i++) {

            // If the propertie was not included in the update and all properties are mandatory the data is incorrect
            if (data["properties"][requiredProperties[i][0]] == undefined && allPMandatory) correct = false;
            
            // If the property is not of the correct type and the property is not undefined 
            // (if it was undefined the error would have been caught above)
            if (typeof data["properties"][requiredProperties[i][0]] != requiredProperties[i][1] && data["properties"][requiredProperties[i][0]] != undefined) correct = false;

            // If the property  inot undefined it is included is important to say that the data 
            // can be correct even with some undefined properties
            if (! (data["properties"][requiredProperties[i][0]] == undefined)) {
                
                insertedData.push([requiredProperties[i][0], data["properties"][requiredProperties[i][0]]]);
            
            }
        }

        if (correct == false) return "incorrect"

        return insertedData;

    };

    this.conn.on('data', recievedData => {
        
        console.log("Data recieved from client " + this.id + ": ", recievedData.toString());
        let data;
        let response;
        
        // From the client the data is a string string. 
        // The data must therefore be parsed to json
        
        try {
            data = JSON.parse(recievedData);
            console.log(JSON.parse(recievedData));
        }
        catch(e) {
            // If an error occurs the client most likely sent incorrect JSON
            console.log("There was an error: ", e);
            console.log(data)
            return this.conn.write(JSON.stringify(responses["unReadableData"]) + "\n")
        }

        // If no function was included an error is returned
        if (! (data["function"])) return this.conn.write(JSON.stringify(responses["missingFunctionOfData"]) + "\n")
        
        // If no properties are found an error is returned
        if (! data["properties"]) return this.conn.write(JSON.stringify(responses["missingProperties"]) + "\n");
        
        // If no device type was included an error is returned
        if (! (data["properties"]["deviceType"])) return this.conn.write(JSON.stringify(responses["missingDeviceType"]) + "\n")
        
        // If no device id was included an error is returned
        if (! (data["properties"]["deviceId"])) return this.conn.write(JSON.stringify(responses["missingDeviceId"]) + "\n")
        
        let table = data["properties"]["deviceType"];

        if (this.identified == false) {

            // LOG
            console.log("Device has not been identified yet");

            // If the device is has not been identified but the function from the client was not specified as
            // initialConnection, an error is returned
            if (! (data["function"] == "initialConnection")) return this.conn.write(JSON.stringify(responses["deviceUnknown"]) + "\n");

            // The database is read to determine if the device has previously been connected
            readFromTable(DBconn, data["properties"]["deviceType"], [["deviceId", data["properties"]["deviceId"]]], (result) => {
                
                /*
                In this stage of the code a handshake is complete when a device has either 
                been recognized or when the information of an unknown device has been saved 
                in the database. This is like asking a stranger for their name and trusting them
                fully afterwards. This obviusly has to be improved
                */
                
                if (result.length > 0) {

                    // LOG
                    console.log("The device has previously been connected")

                    this.id = result[0]["deviceId"];
                    this.properties = data["properties"];

                    this.identified = true;

                    // A message about the succesfull connection is sent back to the client
                    this.conn.write(JSON.stringify(responses["connectionComplete"]) + "\n");

                    // The callback onIdentified is called (see TCP_server.js)
                    onIdentified(this.id);

                } else {

                    console.log("The device has not previously been connected")

                    // Prepares the data from the device to be inserted into the database
                    dataToBeInserted = this.evaluateRecievedData(data, true)

                    if (dataToBeInserted == "incorrect") {

                        // A message about the unsuccesfull connection is sent back to the client
                        this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");

                    } else {

                        // The prepared data is inserted into the database
                        insertIntoTable(DBconn, table, dataToBeInserted)

                        // A message about the succesfull connection is sent back to the client
                        this.conn.write(JSON.stringify(responses["initialConnectionComplete"]) + "\n");
                        
                        this.identified = true
                        this.properties = data["properties"]

                        // The callback onInitialyzation is called (see TCP_server.js)
                        onInitialyzation();

                    }
                }
            })
        }
        
        if (this.identified == false) {

            /*
            This scope should not run unless the device has been identified
            */

            if (data["function"] == "updateOfData") {

                // Where the data has to be inserted
                let where = ["id", data["properties"]["deviceId"]];

                // The updated version of the device data
                let updatedData = this.evaluateRecievedData(data, false)

                // I dont get this!!!!!!

                // if (updateTable == "incorrect") {
                //     //response = JSON.stringify(responses["incorrectProperties"]) + "\n";
                //     this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");
                // } else {
                //     //response = JSON.stringify(responses["updateOfDataComplete"]) + "\n";
                //     this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");
                // }

                updateTable(DBconn, table, where, updatedData);

                // Im leaving this to test this part later

                // console.log("UPDATED DATA")
                // console.log("WHERE: ", where)
                // console.log("TABLE: ", table)
                // console.log("DATA: ", updatedData)

            }
        }
    });

    this.conn.on('end', () => {

        /*
        When this happens the device must be removed from the dict of connecte devices
        Maybe with a callback like the other 2 ones
        */

        console.log("Client " + this.id + ": left");

    });

    this.propertyChange = function(changes) {
        // this function should read the database see what has changed and then update the database

        console.log("Device " + this.id + ": property change")
                
        list_of_properties = deviceTypes[this.properties["deviceType"]]

        // console.log("property change list of properties ", list_of_properties)

        let list_of_data = [];

        for (let i = 0; i < list_of_properties.length; i++) {

            if (changes[list_of_properties[i][0]]) {

               this.properties[list_of_properties[i][0]] = changes[list_of_properties[i][0]]

            }

            // console.log("pushed ", [list_of_properties[i][0], this.properties[list_of_properties[i][0]]])
            list_of_data.push([list_of_properties[i][0], this.properties[list_of_properties[i][0]]])

        }

        // console.log("List of data ", list_of_data);
        

        updateTable(DBconn, this.properties["deviceType"], [["deviceId", this.properties["deviceId"]]], list_of_data);

        
    };

}

// DATABASE PART ---------------------------------------------------------

// Connects to the sql server
let connectToSqlServer = function() {
    let conn = mysql.createConnection({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
    })

    return conn;
};

// Uses the conn object to select the wanted database
let setDB = function(conn, db_name) {
    conn.query('USE ' + db_name + ";", (err, result) => {
        if (err) throw err;
        // console.log(result);
    });
}

// Creates a table based on given data
let createTable = function(conn, tableName, tableData) {

    // Should check if the table already exists

    let name = tableName;

    let cols = "";

    for (let i = 0; i < tableData.length; i++) {
        let colName = tableData[i][0];
        let colType = tableData[i][1];
    
        if (i == tableData.length - 1) cols += colName + " " + colType;
        
        else cols += colName + " " + colType + ", ";

    }

    let sql = "CREATE TABLE " + name + " (" + cols + ");";
   
    // console.log(sql);

    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

// Inserts a new row of data into a table
// Needs some error handling in terms of missing data or wrong data
let insertIntoTable = function(conn, table, data) {

    let order = "";
    let values = "";

    for (let i = 0; i < data.length; i ++) {
        
        if (i == data.length - 1) order += data[i][0];
        else order += data[i][0] + ", ";
        
        
        if (i == data.length - 1) values += "'" + data[i][1] + "'";
        else values += "'" + data[i][1] + "'" + ", ";

    }

    sql = "INSERT INTO " + table + " (" + order + ") VALUES (" + values + ");"

    // console.log(sql)

    conn.query("INSERT INTO " + table + " (" + order + ") VALUES (" + values + ");", (err, result) => {
        if (err) throw err;
        console.log("Device inserted")
        return result
    })
}

// Updatas data in a table based on som changes and conditions
let updateTable = function (conn, table, where, data) {

    let conditions = "";
    let changes = "";

    let iterations = data.length;

    if (where.length > data.length) iterations = where.length;
    
    for (let i = 0; i < iterations; i ++) {

        if (where[i]) {
            conditions += where[i][0] + "=" + "'" + where[i][1] + "'";
            // Add commas if not the last
            if (i != where.length - 1) conditions += ",";

        }

        if (data[i]) {
            changes += data[i][0] + "=" + "'" + data[i][1] + "'"; 
            // Add commas if not the last
            if (i != data.length - 1) changes += ",";
        }

        
    }

    let sql = "UPDATE " + table + " SET " + changes + " WHERE " + conditions + ";"

    // console.log(sql)

    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

// Reads data from table based on conditions in the form ["col1", "hi"] (col1='hi')
// Calls callback when query is done
let readFromTable = function (conn, table, where, callback) {

    let conditions = "";

    
    for (let i = 0; i < where.length; i ++) {

        if (where[i]) conditions += where[i][0] + "=" + "'" + where[i][1] + "'";

        // Add commas if not the last
        if (i != where.length - 1) conditions += ",";

    }

    let sql = "SELECT * FROM " + table + " WHERE " + conditions + ";"

    conn.query(sql, (err, result) => {
        if (err) throw err;
        // Calls callback when query is done
        callback(result);
    })
}

// Exports functions ----------------------------------------------------------
module.exports = {
    Client: Client,
    connectToSqlServer: connectToSqlServer,
    setDB: setDB,
    createTable: createTable,
    insertIntoTable: insertIntoTable,
    updateTable: updateTable,
    readFromTable: readFromTable
}