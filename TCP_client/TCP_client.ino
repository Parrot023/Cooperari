//Example from esp8266:
//https://github.com/esp8266/Arduino/blob/master/libraries/ESP8266WiFi/examples/WiFiClient/WiFiClient.ino

// Libraries
#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
StaticJsonDocument<400> doc;

// Pin definitions
int ledPin = 2;

// Server realated variables ------------------------------>

// Setting the host url and port
const char* host = "192.168.1.143";
const uint16_t port = 9000;

const int numberOfProperties = 5;

const int timeBetweenUpdatesToServer = 10000;

int timeOfLastUpdate = millis();

// The order of the first 4 properties is very important as it is used to create the initilalConnection request
String properties[numberOfProperties][2] = {
  {"deviceType", "switch"}, 
  {"deviceId", "2"},
  {"userId", "1"},
  {"deviceName","Device 1"},
  {"state", "0"}
};

String initialConnection = "{\"function\": \"initialConnection\", \"properties\": {\"deviceType\": \"" + properties[0][1] + "\" ,\"deviceId\": \"" + properties[1][1] + "\",\"userId\": \"" + properties[2][1] + "\",\"deviceName\": \"" + properties[3][1] + "\",\"state\": \"" + properties[4][1] + "\"}}";

bool connectedToServer = false;

// -------------------------------------------------------->


bool state = false;

// Wifi related variables and objects --------------------->

// Defining the wifi credentials
const char* ssid = "Ve23";
const char* password = "Venneminde23tj";

/* 
Im defining the WiFi client in the 
top scope to be able to use it
in all functions 
*/
WiFiClient client;

StaticJsonDocument<400> data;

// --------------------------------------------------------->

StaticJsonDocument<400> process_incoming(String s) {
  
  /*
  Arguments: 
  s: string
  
  Important function for server communication
  
  */

  StaticJsonDocument<400> doc;

  // Printing unmodified string
  Serial.print("Data recieved from server: @");
  Serial.print(s);
  Serial.println("@");

  // Turning the RAW string in to JSON
  DeserializationError error = deserializeJson(doc, s);

  // Checks for error
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.c_str());
    Serial.println("Returned empty JSON doc");
    return doc;
  }

  Serial.println(error.c_str());
  
  return doc;
}

StaticJsonDocument<400> checkForData() {

  /*
  Important function for server communication

  This function checks whether or not new data has been recived and returns a StaticJsonDocument

  If no data has been recieved, the function returns an empty StaticJsonDocument
  */

  StaticJsonDocument<400> emptyReturn;

  if (client.available() > 0){

    // A tiny delay make sure we have recieved every bit of data before processing it
    delay(10);

    StaticJsonDocument<400> response;

    // By the server every json object is seperated by a newline
    // This makes sure that we only read till the end
    String s = client.readStringUntil('\n');

    //Emptying serial buffer
    while(Serial.available() > 0) {Serial.read();}

    response = process_incoming(s);

    return response;

  }

  return emptyReturn;

};

// String propertyChange(StaticJsonDocument<400> data, String properties) {
    
//     StaticJsonDocument<400> recievedProperties = data["properties"];
//     String updatedProperties[numberOfProperties][2] = {properties};

//     String deviceId = recievedProperties["deviceId"];

//     for (int i = 0; i < numberOfProperties; i++) {

//       String v = recievedProperties[properties[i][0]];

//       updatedProperties[i][1] = v;

//     }

//     return updatedProperties;

// }

void setup() {

  // Pin modes
  pinMode(BUILTIN_LED, OUTPUT);

  Serial.begin(9600);

  // General WiFi info
  Serial.print("Connecting to: ");
  Serial.print(ssid);

  // Connecting to WiFi network ------------------------------------------->
  // The program does not move on before a WiFi connection is established
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("WiFi connected");
  Serial.print("IP adress: ");
  Serial.println(WiFi.localIP());

  // ----------------------------------------------------------------------->

  // Connecting to server -------------------------------------------------->
  Serial.println("Connecting to ");
  Serial.print(host);
  Serial.print(":");
  Serial.println(port);

  // Tries to connect to server
  client.connect(host, port);


  // If the connection fails the program will try again after 5 seconds
  while (!client.connected()) {
    Serial.println("Connection to server failed - Trying again in 5 seconds");
    client.connect(host, port);
    delay(5000);
  }

  // Quick debugging message to show that server is connected
  if (client.connected()) {Serial.println("Connection succesfull");}
  
  // ---------------------------------------------------------------------->

  //client.println("{\"function\": \"initialConnection\", \"properties\": {\"deviceType\": \"switch\" ,\"deviceId\": 100,\"userId\": 1,\"deviceName\": \"MyDevice\",\"state\": 0}}");
  
  // Sending to the initial connection requested to the server (waiting for server to respond)------>
  Serial.println(initialConnection);
  client.println(initialConnection);

  while (!connectedToServer) {

    data = checkForData();

    if (data != NULL) {

      if (data["message"] == "The device connected succesfully") {
      
        Serial.println("The device connected succesfully to the server");
        connectedToServer = true;

      }

       if (data["function"] == "propertyChange") {
      
        // propertyChange(data, properties);

        StaticJsonDocument<400> recievedProperties = data["properties"];

        String deviceId = recievedProperties["deviceId"];


        for (int i = 0; i < numberOfProperties; i++) {

          String v = recievedProperties[properties[i][0]];

          properties[i][1] = v;

        }

        // Debugging loop
        for (int i = 0; i < numberOfProperties; i++) {

          Serial.println(properties[i][0] + ": " + properties[i][1]);

        }

        connectedToServer = true;

      }
    }
  } 
  // ----------------------------------------------------------------------------------------------->
}


void loop(){

  digitalWrite(BUILTIN_LED, properties[4][1].toInt());

  // Update of data based on data from server --------------------------->
  data = checkForData();

  if (data["function"] == "propertyChange") {

    StaticJsonDocument<400> recievedProperties = data["properties"];

    String deviceId = recievedProperties["deviceId"];


    for (int i = 0; i < numberOfProperties; i++) {

      String v = recievedProperties[properties[i][0]];

      properties[i][1] = v;

    }

    // Debugging loop
    for (int i = 0; i < numberOfProperties; i++) {

      Serial.println(properties[i][0] + ": " + properties[i][1]);

    }

    // properties = propertyChange(data, properties);

    //   // Debugging loop
    // for (int i = 0; i < numberOfProperties; i++) {

    //   Serial.println(properties[i][0] + ": " + properties[i][1]);

    // }

  }

  // ------------------------------------------------------------------>

  // Sending data to server ------------------------------------------->
  if (millis() - timeOfLastUpdate > timeBetweenUpdatesToServer) {

    String dataToBeSent = "{\"function\": \"updateOfData\", \"properties\": {";

    for (int i = 0; i < numberOfProperties; i++) {

      // dataToBeSent += "\"deviceType\": \"" + properties[0][1] + "\" ,"
      dataToBeSent += "\"" + properties[i][0] + "\": \"" + properties[i][1] + "\"";

      if (i != numberOfProperties - 1) {
        dataToBeSent += ",";
      }

    }

    dataToBeSent += "}}";

    client.println(dataToBeSent);
    Serial.println(dataToBeSent);

    timeOfLastUpdate = millis();

  }
  // ------------------------------------------------------------------>

  // Tiny delay to not ruin communication by running to fast
  delay(20);
}
