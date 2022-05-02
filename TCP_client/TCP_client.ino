//Example from esp8266:
//https://github.com/esp8266/Arduino/blob/master/libraries/ESP8266WiFi/examples/WiFiClient/WiFiClient.ino


#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
StaticJsonDocument<400> doc;

int ledPin = D2;

// Defining the wifi credentials
const char* ssid = "Ve23";
const char* password = "Venneminde23tj";

// Setting the host url and port
const char* host = "192.168.1.118";
const uint16_t port = 9000;

WiFiClient client;

void setup()
{
    Serial.begin(9600);

    Serial.print("Connecting to");
    Serial.print(ssid);

    // Connecting to WIFI -----------------
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }

    Serial.println("WiFi connected");
    Serial.println("IP adress: ");
    Serial.println(WiFi.localIP());
    // --------------------------------------

    pinMode(ledPin, OUTPUT);

     Serial.println("Connecting to ");
    Serial.print(host);
    Serial.print(":");
    Serial.println(port);

    client.connect(host, port);

    // Sets up a connection to the host ---------
    

    // If the connection fails the program will try again after 5 seconds
    while (!client.connected()) {
      Serial.println("Connection failed");
      client.connect(host, port);
      delay(5000);
    }
    // ------------------------------------------

}

void loop(){
   

    // If the ESP is connected to the server it will send the string - Hello from NodeMCU
    Serial.println("Sending data to server");
    
    if (client.connected()) {
      client.println("Hello from NodeMCU");
    }

    // If data has been sent from the server (data is available)
    // it will be printed to the serial monitor
    if (client.available() > 0){

      delay(10);

      String s = client.readStringUntil('\n');
      
      //Emptying serial buffer
      while(Serial.available() > 0) {Serial.read();}

      Serial.print("I recieved: @");
      Serial.print(s);
      Serial.println("@");

      DeserializationError error = deserializeJson(doc, s);
      if (error) 
      {
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.c_str());
        return;
      }
      Serial.println(error.c_str());
      
      const char* value = doc["message"];
      Serial.println(value);

      if (doc["message"] == "hi") {
        Serial.println("FUCK YES");
      }


    
    }
  delay(1000*5);
}
