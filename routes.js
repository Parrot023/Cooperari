module.exports = function(app, devices){

    app.get('/', (req, res) => {

        console.log("User send data")
        console.log("clientId: " + req.query["clientId"]);
        console.log("on: " + req.query["on"]);
    
        // Sending the data to the device
        // This should in the future happen thorugh a function in the client object function
        devices[String(req.query["clientId"])].conn.write(JSON.stringify({
            "on": req.query["on"],
        }) + "\n")
    
        res.send("<h1>Thanks for your input</h1> <br><br> <p>You hav now changed the state of client " + req.query["clientId"] + " to " + req.query["on"] + "</p>");
    
    });

}