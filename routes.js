module.exports = function(app, devices, tools, DBconn){

    app.get('/propertyChange', (req, res) => {

        console.log("User send data")
        console.log("deviceId: " + req.query["deviceId"]);
        console.log("on: " + req.query["on"]);
    
        // The properties of the device are changed. As the function only uses key-value pairs 
        // required by the device in the update of the properties the entire req body is for now sent.
        // excess properties are ignored
        devices[String(req.query["deviceId"])].propertyChange(req.query)
    
        res.send("<h1>Thanks for your input</h1> <br><br> <p>You hav now changed the state of client " + req.query["deviceId"] + " to " + req.query["on"] + "</p>");
    
    });

    app.get('/deviceData', (req, res) => {

        /*
        This function returns all neccessary information about the device from the server to the web client
        */

        console.log("A webclient requested data about a device")
        console.log("deviceId: " + req.query["deviceId"]);
        console.log("deviceType: " + req.query["deviceType"]);


        tools.readFromTable(DBconn, req.query["deviceType"], [["deviceId", req.query["deviceId"]]], (result) => {
            
            res.send(result);
        
        })
           
    })

}