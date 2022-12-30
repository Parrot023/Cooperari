const mysql = require('mysql2');
require('dotenv').config();


// CLIENT PART ----------------------------------------------------------

let return_message = {
    "message": "hi",
};

let deviceTypes = {
    "SWITCH": [
        ["deviceType", "string"],
        ["deviceName", "string"],
        ["deviceId", "number"],
        ["state", "number"]
    ]
}

let responses = {
    "initialConnectionComplete": {
        "status": "SUCCES",
        "message": "The device has know been registred as known"
    },
    "updateOfDataComplete": {
        "status": "SUCCES",
        "message": "The data was updated succesfully"
    },
    "unReadableData": {
        "status": "ERROR",
        "message": "The data could not be parsed as JSON"
    },
    "missingFunctionOfData": {
        "status": "ERROR",
        "message": "The function of the data could not be understood"
    },
    "missingDeviceType": {
        "status": "ERROR",
        "message": "The device type was not included"
    },
    "missingDeviceId": {
        "status": "ERROR",
        "message": "The device ID was not included"
    },
    "deviceUnknown": {
        "status": "ERROR",
        "message": "Device unknown"
    },
    "missingProperties": {
        "status": "ERROR",
        "message": "No device properties could be found"
    },
    "incorrectProperties": {
        "status": "ERROR",
        "message": "Some properties where either missing or was not of the right type"
    },
    "incorrectData": {
        "status": "ERROR",
        "message": "The data was incorrect"
    }
}


// Client object to handle the connection with the client
function Client(conn, id) {

    this.conn = conn;
    this.id = id;

    this.status = "unknown";

    this.evaluateRecievedData = function(data, allPMandatory) {

        let deviceType = data["properties"]["deviceType"];
        let requiredProperties = deviceTypes[deviceType]
        let correct = true;
        let insertedData = [];

        console.log("Required properties - ", requiredProperties)
        console.log("Device properties - ", data["properties"])
        
        for (let i = 0; i < requiredProperties.length; i++) {

            // If the propertie was not included in the update and all properties are mandatory the data is incorrect
            if (! data["properties"][requiredProperties[i][0]] && allPMandatory) correct = false;
            
            console.log("typeof ", typeof data["properties"][requiredProperties[i][0]])
            console.log("required type ", requiredProperties[i][1])
            
            // If the property is not of the correct type and the property is not undefined 
            // (if it was undefined the error would have been caught above)
            if (typeof data["properties"][requiredProperties[i][0]] != requiredProperties[i][1] && data["properties"][requiredProperties[i][0]] != undefined) correct = false;

            // If the property  inot undefined it is included is important to say that the data 
            // can be correct even with some undefined properties
            if (! (data["properties"][requiredProperties[i][0]] == undefined)) {
                
                insertedData.push([requiredProperties[i][0], data["properties"][requiredProperties[i][0]]]);
            
            }
        }

        if (! correct) return "incorrect"

        return insertedData;

    };

    this.conn.on('data', recievedData => {
        
        console.log("Data recieved from client " + this.id + ": ", recievedData.toString());

        // From the client the data is in the string string format. 
        // The data must therefore be parsed to json

        // I believe there has be included som sort of data part
        // in this data part every comma seperated piece of data will have a matching col in
        // the database this way the database can be updated directly
        
        let data;
        let response;


        try {
            data = JSON.parse(recievedData);
            console.log(JSON.parse(recievedData));
        }
        catch(e) {
            // console.log(e);
            console.log(data)
            return this.conn.write(JSON.stringify(responses["unReadableData"]) + "\n")
        }

        let table = data["properties"]["deviceType"];

        if (! (data["function"])) return this.conn.write(JSON.stringify(responses["missingFunctionOfData"]) + "\n")

        if (! (data["properties"]["deviceType"])) return this.conn.write(JSON.stringify(responses["missingDeviceType"]) + "\n")

        if (! (data["properties"]["deviceId"])) return this.conn.write(JSON.stringify(responses["missingDeviceId"]) + "\n")


        if (this.status == "unknown") {

            // If the device is unknown but the function from the client wasnt specified as
            // initialConnection an error is returned
            if (! (data["function"] == "initialConnection")) return this.conn.write(JSON.stringify(responses["deviceUnknown"]) + "\n");

            // If no properties are found an error is also returned
            if (! data["properties"]) return this.conn.write(JSON.stringify(responses["missingProperties"]) + "\n");

            insertedData = this.evaluateRecievedData(data, true)

            console.log("INSERTED DATA ", insertedData);

            if (insertedData == "incorrect") {

                // If the program makes it to this point the properties are ready to be inserted into the database
                // Table must be created first
                insertIntoTable(conn, table, insertedData)

                // Setting the response back the client
                response = JSON.stringify(responses["incorrectProperties"]) + "\n";
            }
            
            else {
                response = JSON.stringify(responses["initialConnectionComplete"]) + "\n"
                this.status = "known"

            }

            console.log("INSERTED DATA");
            console.log("TABLE: ", table)
            console.log("DATA: ", insertedData)

        }

        if (data["function"] == "updateOfData") {

            let updatedData;
            let where = ["id", data["properties"]["deviceId"]];
            // If no properties found
            if (! data["properties"]) return this.conn.write(JSON.stringify(response["missingProperties"]))

            updatedData = this.evaluateRecievedData(data, false)

            if (updateTable == "incorrect") {
                response = JSON.stringify(responses["incorrectProperties"]) + "\n";
            } else {
                response = JSON.stringify(responses["updateOfDataComplete"]) + "\n";
            }

            // At the moment the table is non existing
            // updateTable(conn,table,where, updatedData);

            console.log("UPDATED DATA")
            console.log("WHERE: ", where)
            console.log("TABLE: ", table)
            console.log("DATA: ", updatedData)

        }

        // Response to client after having succesfully recieved data
        // If response = undefined send back error !
        if (response == undefined) response = JSON.stringify(responses["incorrectData"]) + "\n";
        this.conn.write(response);

        console.log("Send back: ", response);

    });

    this.conn.on('end', () => {

        console.log("Client " + this.id + ": left");

    })
}

// DATABASE PART ---------------------------------------------------------

// Connects to the sql server
let connectToSqlServer = function() {
    let conn = mysql.createConnection({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.PASSWORD,
    })

    return conn;
};

// Uses the conn object to select the wanted database
let setDB = function(db_name) {
    conn.query('USE ' + db_name + ";", (err, result) => {
        if (err) throw err;
        console.log(result);
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
   
    console.log(sql);

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

    console.log(sql)

    conn.query("INSERT INTO " + table + " (" + order + ") VALUES (" + values + ");", (err, result) => {
        if (err) throw err;
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

        if (where[i]) conditions += where[i][0] + "=" + "'" + where[i][1] + "'";
        if (data[i]) changes += data[i][0] + "=" + "'" + data[i][1] + "'"; 


        // Add commas if not the last
        if (i != data.length - 1) changes += ",";
        if (i != where.length - 1) conditions += ",";

    }

    let sql = "UPDATE " + table + " SET " + changes + " WHERE " + conditions + ";"

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