//Example from esp8266:
//https://github.com/esp8266/Arduino/blob/master/libraries/ESP8266WiFi/examples/WiFiClient/WiFiClient.ino

// Libraries
#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
StaticJsonDocument<400> doc;

// Pin definitions
int ledPin = D2;

// Defining the wifi credentials
const char* ssid = "Ve23";
const char* password = "Venneminde23tj";

// Setting the host url and port
const char* host = "192.168.1.118";
const uint16_t port = 9000;

/* 
Im defining the WiFi client in the 
top scope to be able to use it
in all functions 
*/
WiFiClient client;


StaticJsonDocument<400> process_incoming(String s) {
  
  /*
  Arguments: 
  s: string
  */

  StaticJsonDocument<400> doc;

  // Printing unmodified string
  Serial.print("I recieved: @");
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

void setup()
{

    // Creating a state JSON Doc
    DynamicJsonDocument state(1024);

    // Interacting with the JSON Doc
    state["switch_state"] = "off";

    // Pin modes
    pinMode(ledPin, OUTPUT);

    Serial.begin(9600);

    // General WiFi info
    Serial.print("Connecting to: ");
    Serial.print(ssid);

    // Tries to connect to WiFi -----------------
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }

    // General info for debugging
    Serial.println("WiFi connected");
    Serial.println("IP adress: ");
    Serial.println(WiFi.localIP());

    Serial.println("Connecting to ");
    Serial.print(host);
    Serial.print(":");
    Serial.println(port);

    // Tries to connect to server
    client.connect(host, port);

    // Quick debugging message to show that server is connected
    if (client.connected()) {Serial.println("Connection succesfull");}

    // If the connection fails the program will try again after 5 seconds
    while (!client.connected()) {
      Serial.println("Connection failed - Trying again in 5 seconds");
      client.connect(host, port);
      delay(5000);
    }
    // ------------------------------------------

}

void loop(){
   

    
    //If the ESP is connected to the server it will send the string - Hello from NodeMCU
    if (client.connected()) {

      Serial.println("Sending data to server");
      
      client.println("Hello from NodeMCU");
    }

    // If data has been sent from the server (data is available)
    // it will be printed to the serial monitor
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

    }

    delay(5000);
}
