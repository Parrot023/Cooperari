// CLIENT PART ----------------------------------------------------------

const fs = require('fs');
const readFromTable = require('./tools').readFromTable;
const insertIntoTable = require('./tools').insertIntoTable;
const updateTable = require('./tools').updateTable;


let return_message = {
    "message": "hi",
};

let deviceTypes = {
    "switch": [
        ["deviceType", "string"],
        ["deviceId", "string"],
        ["userId", "string"],
        ["deviceName", "string"],
        ["state", "string"]
    ]
}

// readFileSync stop the program from continuing before the data has been read
let rawResponses = fs.readFileSync('responses.json')

let responses = JSON.parse(rawResponses);

// Client object to handle the connection with the client
function Device(conn, DBconn, onIdentified, onInitialyzation, onDisconnected) {

    this.conn = conn;
    this.id = undefined;

    this.identified = false;

    this.properties;

    this.evaluateRecievedData = function(data, allPMandatory) {

        let deviceType = data["properties"]["deviceType"];
        let requiredProperties = deviceTypes[deviceType]
        let correct = true;
        let insertedData = [];
        
        //console.log("evaluate date: " + data);

        for (let i = 0; i < requiredProperties.length; i++) {

            // If the propertie was not included in the update and all properties are mandatory the data is incorrect
            if (data["properties"][requiredProperties[i][0]] == undefined && allPMandatory) {
                correct = false; 
                //console.log("property was missing" + requiredProperties[i][0]);
            }
            
            // If the property is not of the correct type and the property is not undefined 
            // (if it was undefined the error would have been caught above)
            if (typeof data["properties"][requiredProperties[i][0]] != requiredProperties[i][1] && data["properties"][requiredProperties[i][0]] != undefined) {
                correct = false;
                //console.log("A property was not the correct type");
            } 

            // If the property is not undefined it is included
            // it is important to say that the data can be correct even with some undefined properties
            if (! (data["properties"][requiredProperties[i][0]] == undefined)) {
                
                insertedData.push([requiredProperties[i][0], data["properties"][requiredProperties[i][0]]]);
            
                //console.log("a property was undefined");
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
            console.log("correct json")
        }
        catch(e) {
            // If an error occurs the client most likely sent incorrect JSON
            console.log("There was an error with the recieved JSON");
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

                    console.log(data);
                    // Prepares the data from the device to be inserted into the database
                    dataToBeInserted = this.evaluateRecievedData(data, true)

                    if (dataToBeInserted == "incorrect") {

                        // A message about the unsuccesfull connection is sent back to the client
                        this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");

                    } else {

                        console.log(dataToBeInserted);

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
        
        if (this.identified == true) {

            /*
            This scope should not run unless the device has been identified
            */

            if (data["function"] == "updateOfData") {


                // The updated version of the device data
                let updatedData = this.evaluateRecievedData(data, false)

                 // Where the data has to be inserted
                 let where = [["deviceId", data["properties"]["deviceId"]]];

                if (updatedData == "incorrect") {
                
                    console.log("Data was incorrect");
                
                } else {
                    
                    //console.log("Data was correct");

                    updateTable(DBconn, table, where, updatedData);

                    this.conn.write(JSON.stringify(responses["updateOfDataComplete"]) + "\n");

                    console.log("Updated table")

                    // Im leaving this to test this part later

                    // console.log("UPDATED DATA")
                    // console.log("WHERE: ", where)
                    // console.log("TABLE: ", table)
                    // console.log("DATA: ", updatedData)

                }

                // I dont get this!!!!!!

                // if (updateTable == "incorrect") {
                //     //response = JSON.stringify(responses["incorrectProperties"]) + "\n";
                //     this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");
                // } else {
                //     //response = JSON.stringify(responses["updateOfDataComplete"]) + "\n";
                //     this.conn.write(JSON.stringify(responses["incorrectProperties"]) + "\n");
                // }


            }
        }
    });

    this.conn.on('end', () => {

        /*
        When this happens the device must be removed from the dict of connected devices
        Maybe with a callback like the other 2 ones
        */

        console.log("Client " + this.id + ": left");

        onDisconnected(this.id);

    });

    this.propertyChange = function(changes) {

        /*
        This function reads the database and compares the data to the changed data.
        Any changes will thne be updated in the database and in the clients own property dict

        THE HOLE CONCEPT MUST BE THOUGHT THROUGH

        THE LIST OF PROPERTIES MUST BE SET IN THE BEGINNING

        */

        // LOG
        console.log("Device " + this.id + ": property change")
        
        // Retrieving the dict of required properties for the device
        list_of_properties = deviceTypes[this.properties["deviceType"]]

        let list_of_data = [];

        for (let i = 0; i < list_of_properties.length; i++) {

            
            if (changes[list_of_properties[i][0]]) {
                
                // Changes this.properties if the key has chnaged value
                this.properties[list_of_properties[i][0]] = changes[list_of_properties[i][0]]

            }

            // Pushes data to the list in the form ["column name", "value"]
            // At the moment every property is rewritten in the database. This could be optimized 
            // so that only the changed ones are updated. This can be achieved by only pushing to
            // list_of_data when a change is detected
            list_of_data.push([list_of_properties[i][0], this.properties[list_of_properties[i][0]]])

        }
        
        this.conn.write(JSON.stringify({"function": "propertyChange", "properties": this.properties}) + "\n");
        // updates the databse with list_of_data where deviceId = this.properties["deviceId"]
        updateTable(DBconn, this.properties["deviceType"], [["deviceId", this.properties["deviceId"]]], list_of_data);
        
    };

}

module.exports = {
    Device: Device,
}