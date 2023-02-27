module.exports = function(app, devices){

    app.get('/', (req, res) => {

        console.log("User send data")
        console.log("clientId: " + req.query["clientId"]);
        console.log("on: " + req.query["on"]);
    
        // The properties of the device are changed. As the function only uses key-value pairs 
        // required by the device in the update of the properties the entire req body is for now sent.
        // excess properties are ignored
        devices[String(req.query["clientId"])].propertyChange(req.query)
    
        res.send("<h1>Thanks for your input</h1> <br><br> <p>You hav now changed the state of client " + req.query["clientId"] + " to " + req.query["on"] + "</p>");
    
    });

}