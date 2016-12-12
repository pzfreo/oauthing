#include <ESP8266TrueRandom.h>

#include <Button.h>

#include <ArduinoJson.h>

#include <PubSubClient.h>
#include <EEPROM.h>
#include <ESP8266WiFi.h>
//#include <ESP8266mDNS.h>


const char *mfrserver = "oauthing.io";
const int mfrport = 1883;
const char *mfrservertopic = "/mfr/pres";

#define LED 14
#define BUTTON 12

Button b = Button(BUTTON, true, false, 100);

//void callback(char* topic, byte* payload, unsigned int length);

WiFiClient wifiClient;
WiFiClientSecure secureClient;
PubSubClient mqttclient;

const int BUFFER_SIZE = JSON_OBJECT_SIZE(10); // 5 is the most so far, just being careful.



const char *oauthing = "oauthing.io";
const int oauthingport = 8883;
const int LEDPIN = 4;

int state = -1;
// states
// -1 - not running
// 0 - in manufacturing -  waiting for clientid / client_secret (REBOOT after)
// 1 - bought - waiting for authcode
// 2 - in registration - waiting for refresh-token (REBOOT after)
// 3 - configured / freshly booted - waiting for access token
// 4 - running - everything in place

const char* ssid     = "...";
const char* password = "...";

uint32 chipid = 0;
char hostString[16] = {0};
int flashspeed = 100;
boolean led = false;

char client_id[50] = {0};
char client_secret[50] = {0};
char tokenserver[100] = {0};
char refreshtoken[60] = {0};
const char *igniteserver = "ignite-iot.net";
const int igniteport = 8888;

char accesstoken[60] = {0};
char authcode[20] = {0};
int access_token_expires = 0;
boolean configured = false;

void clearEEPROM() {
  EEPROM.begin(512);
  // write a 0 to all 512 bytes of the EEPROM
  for (int i = 0; i < 512; i++) {
    EEPROM.write(i, 0);
  }

  EEPROM.commit();
  EEPROM.end();
}

void writeEEPROM() {

  // EEPROM layout
  // Byte 0 = 67 (indicates we've done something)
  // Byte 1 = status
  //        : 0 means brand new - not yet issued a clientid
  //        : 1 means waiting to register - needs an owner
  //        : 2 means working
  // Byte 2 = length of string inc \0 (and below)
  // Byte 3-  : clientId
  // Byte n : length of string
  // next n bytes : clientsecret
  // byte m : length of string
  // next n bytes: authserver mqtt dns name
  // byte p: length of string
  // next n bytes: refresh token
  // byte q: length of string
  // next n bytes: actual middleware mqtt server (ignite) (nyi)
  EEPROM.begin(512);
  int n = 0;
  EEPROM.write(n++, 0x67);
  EEPROM.write(n++, state);
  if (state > 0) {
    Serial.println(strlen(client_id));
    //todo check the length of each of these.
    Serial.println(n);
    EEPROM.write(n++, strlen(client_id) + 1);
    for (int i = 0;  i < strlen(client_id); i++) {
      EEPROM.write(n++, (unsigned int)client_id[i]);
      Serial.print((unsigned int)client_id[i]);
      Serial.println('.');
    }
    Serial.println(n);
    EEPROM.write(n++, 0);
    EEPROM.write(n++, strlen(client_secret) + 1);
    for (int i = 0; i < strlen(client_secret); i++) {
      EEPROM.write(n++, (unsigned int)client_secret[i]);
    }
    EEPROM.write(n++, 0);
    EEPROM.write(n++, strlen(tokenserver) + 1);
    for (int i = 0; i < strlen(tokenserver); i++) {
      EEPROM.write(n++, (unsigned int)tokenserver[i]);
    }
    EEPROM.write(n++, 0);
  }
  if (state > 2) {
    Serial.println(refreshtoken);
    Serial.println(strlen(refreshtoken));
    Serial.println(n);

    EEPROM.write(n++, strlen(refreshtoken) + 1);
    for (int i = 0;  i < strlen(refreshtoken); i++) {
      EEPROM.write(n++, (unsigned int)refreshtoken[i]);
    }
    EEPROM.write(n++, 0);
  }
  Serial.println("committing EEPROM");
  EEPROM.commit();
  EEPROM.end();
  Serial.print ("wrote n bytes to EEPROM : ");
  Serial.println(n);
  delay(3000);
}



void readEEPROM() {
  EEPROM.begin(512);
  state = EEPROM.read(1);
  if (EEPROM.read(0) != 0x67 || state > 4 || state < 0) {
    Serial.println("oh dear wrong value in EEPROM 0");
    EEPROM.write(0, 0x67);
    EEPROM.write(1, 0);
    EEPROM.commit();
    boolean onoff = true;
    for (int i = 0; i < 10; i++) {
      digitalWrite(LED, onoff);
      onoff = ! onoff;
      delay(100);
    }
    ESP.wdtDisable();
    ESP.restart();
  }

  if (state == 0) return;
  int n = 2;
  int l = 0;
  if (state > 0) {
    char buffer[100];

    l = EEPROM.read(n++);
    if (l > 0) {
      for (int i = 0; i < l - 1; i++) {
        Serial.println(EEPROM.read(n));
        buffer[i] = (char)EEPROM.read(n++);
      }
      buffer[l - 1] = 0x00;
      n++;
    }
    Serial.print(buffer);
    strcpy(client_id, buffer);
    l = EEPROM.read(n++);
    if (l > 0) {
      for (int i = 0; i < l - 1; i++) {
        buffer[i] = (char)EEPROM.read(n++);
      }
      buffer[l - 1] = 0x00;
      n++;
    }
    Serial.print(buffer);
    strcpy(client_secret, buffer);

    l = EEPROM.read(n++);
    if (l > 0) {
      for (int i = 0; i < l - 1; i++) {
        buffer[i] = EEPROM.read(n++);
      }
      buffer[l - 1] = 0x00;
      n++;
    }
    Serial.print(buffer);
    strcpy(tokenserver, buffer);
  }
  if (state > 2) {
    char buffer[100];

    l = EEPROM.read(n++);
    if (l > 0) {
      for (int i = 0; i < l - 1; i++) {
        buffer[i] = EEPROM.read(n++);
      }
      buffer[l - 1] = 0x00;
      n++;
    }
    Serial.print(buffer);
    strcpy(refreshtoken, buffer);
    //    l = EEPROM.read(n++);
    //    if (l>0) {
    //      for (int i=0; i++; i<l-1) {
    //        buffer[i] = EEPROM.read(n++);
    //      }
    //      buffer[l-1]=0x00;
    //      n++;
    //    }
    //    Serial.print(buffer);
    //    strcpy(igniteserver, buffer);
    EEPROM.end();
  }



}

void mqttreconnect() {
  // Loop until we're reconnected
  boolean onoff = true;
  boolean success = false;
  char deviceid[8] = {0};
  sprintf(deviceid, "%i", chipid);
  // need to deal with uid/pw and refresh in the case of state 2.
  while (!mqttclient.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (state == 0) { // when in manufacturing use the device id as the mqtt client id
      mqttclient = PubSubClient(mfrserver, mfrport, callback, wifiClient);
      success = mqttclient.connect(deviceid); // no password in manufacturing stage
    }
    else if (state < 4) {
      mqttclient = PubSubClient(oauthing, oauthingport, callback, secureClient);
      success = mqttclient.connect(deviceid, client_id, client_secret);
      if (success) {
        boolean verified = secureClient.verify("03:DB:9A:3F:D0:21:D8:5D:B0:D4:CC:E4:6B:94:52:37:96:47", oauthing);
        Serial.print(verified ? "verified tls!" : "unverified tls");
      }
    }
    else
    {
      mqttclient = PubSubClient(igniteserver, igniteport, thingCallback, secureClient);
      success = mqttclient.connect(deviceid, "Bearer", accesstoken);
      if (success) {
        boolean verified = secureClient.verify("03:18:4E:D7:F9:46:12:DB:47:59:E4:39:8D:22:1E:43:B7:BA", igniteserver);
        Serial.print(verified ? "verified tls!" : "unverified tls");
        mqttclient.subscribe("/c/led0");
      }

    }

    if (success) {
      // nothing to do here!
      digitalWrite(LED, 0);
      Serial.println("connected to mqtt");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttclient.state());
      delay(2000);
      digitalWrite(LED, onoff);
      onoff = !onoff;

    }
  }
  
}

void callback(char* topic, byte* payload, unsigned int length) {
  // first convert byte array into string
  Serial.println(topic);
  Serial.println("callback");
  StaticJsonBuffer<BUFFER_SIZE> jsonBuffer;

  char paystring[301] = { 0 };
  if (length > 300) {
    Serial.println("incoming message bigger than buffer");
    delay(5000);
    ESP.reset();
  }
  memcpy(paystring, payload, length);
  memcpy(paystring + length, "\0", 1);
  Serial.print("message: ");
  Serial.println(paystring);

  if (state == 0) {

    // waiting for message to topic /dev/{d} containing cid/cs
    //    char buff[5];
    //    strncpy(buff, topic, 5);
    //
    //    if (strncmp(buff,"/dev/",5)) {
    JsonObject& root = jsonBuffer.parseObject(paystring);
    if (!root.success()) {
      // looks like a disaster
      Serial.println("can't parse JSON with cid/cs in it");
      ESP.reset();
    }

    if (root.containsKey("tokenserver"))
    {
      strcpy(tokenserver, root["tokenserver"]);
    }
    strcpy(client_id, root["client_id"]);
    strcpy(client_secret, root["client_secret"]);

    state = 1;

    Serial.println(client_id);
    Serial.println(client_secret);

    writeEEPROM();
    delay(2000);
    Serial.println("ready to be owned!");
    ESP.reset();
    //    }
    //    else
    //    {
    //        // no idea what to do with this message
    //        // error
    //        Serial.println("message came in without right topic");
    //        delay(5000);
    //        ESP.reset();
    //    }
  } else if (state == 1) {
    char buff[5];
    strncpy(buff, topic, 5);
    // todo proper check of the full topic
    if (true) { //strncmp(buff,"/cid/",5)) {
      JsonObject& root = jsonBuffer.parseObject(paystring);
      if (!root.success()) {
        // looks like a disaster
        Serial.println("can't parse JSON with accesstoken/refreshtoken in it");
        ESP.reset();
      }
      strcpy(authcode, root["authcode"]);
      Serial.println(authcode);
      JsonObject& tokenreq = jsonBuffer.createObject();
      //tokenreq["client_id"] = client_id;
      //tokenreq["client_secret"] = client_secret;
      tokenreq["authcode"] = authcode;
      tokenreq["grant_type"] = "authorization_code";

      // todo add scope here
      char buffer[400];
      tokenreq.printTo(buffer, sizeof(buffer));
      Serial.println(buffer);
      mqttclient.publish("/token", buffer);
      state = 2;
      return;
    }
    else
    {
      // no idea what to do with this message
      // error
      Serial.println("message came in without right topic");
      delay(5000);
      ESP.reset();
    }
  } else if (state == 2) {
    char buff[5];
    strncpy(buff, topic, 5);
    if (true) { //strncmp(buff,"/cid/",5)) {
      JsonObject& root = jsonBuffer.parseObject(paystring);
      if (!root.success()) {
        // looks like a disaster
        Serial.println("can't parse JSON with accesstoken/refreshtoken in it");
        ESP.reset();
      }

      // todo make sure these are present
      strcpy(refreshtoken, root["refresh_token"]);
      strcpy(accesstoken, root["access_token"]);
      access_token_expires = root["expires_in"];
      state = 3;
      writeEEPROM();
      char buffer[100];
      sprintf(buffer, "{ \"client_id\":\"%s\"}", client_id);
      mqttclient.publish("/ready", buffer);
      Serial.println("refreshed");
      for (int i = 0; i < 4; i++) {
        digitalWrite(LED, 1);
        delay(800);
        digitalWrite(LED, 0);
        delay(200);
      }
      ESP.restart();
    }
    else
    {
      // no idea what to do with this message
      // error
      Serial.println("message came in without right topic");
      delay(5000);
      ESP.restart();
    }
  } else if (state == 3) {
    char buff[5];
    strncpy(buff, topic, 5);
    if (true) { //strncmp(buff,"/cid/",5)) {
      JsonObject& root = jsonBuffer.parseObject(paystring);
      if (!root.success()) {
        // looks like a disaster
        Serial.println("can't parse JSON with accesstoken/refreshtoken in it");
        ESP.reset();
      }
      //      strcpy(refreshtoken, root["refresh_token"]);
      strcpy(accesstoken, root["access_token"]);
      //      access_token_expires = root["expires_in"];
      //      writeEEPROM();
      configured = true;
      Serial.println("refreshed");
      Serial.print("refresh: "); Serial.println(refreshtoken);
      mqttclient.disconnect();
      state = 4;
      return;
    }
    else
    {
      // no idea what to do with this message
      // error
      Serial.println("message came in without right topic");
      delay(5000);
      ESP.reset();
    }
  }

}




void resetButtonLogic(Button button, int led) {
  boolean setuploop = true;
  boolean onoff = true;
  boolean firstdone = false;




  button.read();
  if (button.isPressed()) {
    digitalWrite(led, 1);
    // wait until released
    button.read();
    while (button.isPressed()) {
      delay(10);
      button.read();
    }
    digitalWrite(led, 0);

    while (setuploop) {
      button.read();

      if (button.pressedFor(5000)) {
        firstdone = true;
      }
      if (button.pressedFor(10000)) {
        setuploop = false;
        clearEEPROM();
        digitalWrite(led, 0);
        delay(1000);
        digitalWrite(led, 1);
        delay(3000);
        digitalWrite(led, 0);
        ESP.restart();
      }
      if (button.wasReleased()) // button has been short pressed again
      {
        if (!firstdone) {
          setuploop = false;
          digitalWrite(LED, 0);
          break;
        }
        else {
          for (int i = 0; i < 10; i++) {
            delay(1000);
            digitalWrite(led, onoff);
            onoff = !onoff;
          }
          if (state > 0) state = 1; // no point resetting to state 1 if its already in state 0
          clearEEPROM(); // make sure refresh token is wiped
          writeEEPROM();
          digitalWrite(led, 0);
          delay(1000);
          digitalWrite(led, 1);
          delay(1000);
          digitalWrite(led, 0);
          ESP.restart();
        }
      }
      delay(firstdone ? 75 : 150);
      digitalWrite(led, onoff);
      onoff = !onoff;
    }

  }
}

void thingCallback(char* topic, byte* payload, unsigned int length)
{
  Serial.println(topic);
  Serial.println("thing callback");
  StaticJsonBuffer<BUFFER_SIZE> jsonBuffer;
  char paystring[101] = { 0 };
  if (length > 100) {
    Serial.println("incoming message bigger than buffer");
  }
  else {
    memcpy(paystring, payload, length);
    memcpy(paystring + length, "\0", 1);
    Serial.print("message: ");
    Serial.println(paystring);
    JsonObject& root = jsonBuffer.parseObject(paystring);
    if (!root.success()) {
      Serial.println("can't parse JSON");
    }
    if (root.containsKey("on")) {
      
      boolean ledOn = root["on"].as<boolean>();
      Serial.print("setting led :"); Serial.println(ledOn);
      digitalWrite(LED, ledOn ? 1 : 0);
    }
  }
}



void setup() {
  pinMode(LED, OUTPUT);     // Initialize the LED_BUILTIN pin as an output
  pinMode(BUTTON, INPUT_PULLUP);

  delay(500);
  digitalWrite(LED, 1);
  delay(200);
  digitalWrite(LED, 0);
  delay(200);
  digitalWrite(LED, 1);
  delay(200);
  digitalWrite(LED, 0);

  resetButtonLogic(b, LED);
  delay(1000);


  Serial.begin(115200);
  Serial.println(ESP.getChipId());
  //chipid = ESP.getChipId();
  chipid = ESP8266TrueRandom.random();
  chipid = chipid & 0xFFFFFF; // make sure its 6  hex digits
  Serial.print("chip id: ");
  Serial.println(chipid);
  sprintf(hostString, "ESP_%06X", chipid);

  //  EEPROM.begin(512);
  readEEPROM();
  Serial.print("state ");
  Serial.println(state);
  for (int i = 0; i < state + 1; i++) {
    digitalWrite(LED, 1);
    delay(200);
    digitalWrite(LED, 0);
    delay(200);
  }
  delay(1000);

  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF); 
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  boolean onoff = false;
  while (WiFi.status() != WL_CONNECTED) {
    delay(50);
    onoff = !onoff;
    digitalWrite(LED, onoff);
    Serial.print("w");
  }
  digitalWrite(LED, 0);




  // state 0 = wait for clientid/secret
  // connect to mdns to get the MQTT server
  // Flash LED every 500ms

  if (state == 0) {
    //    a future version will use mDNS to find the local manufacturing server
    //    flashspeed = 100;
    //    MDNS.begin(hostname);
    //    while (MDNS.queryService("mqtt", "tcp")==0) {
    //      delay(flashspeed);
    //      led != led;
    //      digitalWrite(4, led);
    //    }
    //    flashspeed = 500;

    mqttclient.setServer(mfrserver, 1883).setCallback(callback);
    mqttreconnect();
    char subsstring[20] = {0};
    sprintf(subsstring, "/dev/%i/cc", chipid);
    Serial.print("subsstring ");
    Serial.println(subsstring );
    mqttclient.subscribe(subsstring);
    StaticJsonBuffer<BUFFER_SIZE> jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    root["d"] = chipid;
    char buffer[25];
    root.printTo(buffer, sizeof(buffer));
    mqttclient.publish(mfrservertopic, buffer);
    Serial.println("waiting for cid/cs");
    long ms = millis();
    boolean onoff = false;
    while (state == 0) {
      //      mqttclient.setCallback(callback);
      // todo publish presence less frequently

      mqttreconnect();

      mqttclient.loop();
      delay(50);
      if ((millis() - ms) > 5000) {
        ms = millis();
        mqttclient.publish(mfrservertopic, buffer);
        digitalWrite(LED, 1);
        delay(100);
        digitalWrite(LED, 0);
      }
      // wait for callback
    }
    // either the message has come back successfully or not
    // either way reset and handle the next step
    Serial.println("no longer in state 0");
    ESP.restart();
  }
  else if (state == 1) {

    Serial.print("client_id");
    Serial.println(client_id);
    // state 1 = wait for OAuth token
    // connect to proper server
    // Flash LED every second
    //    mqttclient.setServer(oauthing, 1883).setCallback(callback);
    mqttreconnect();
    char subsstring[50] = {0};
    sprintf(subsstring, "/cid/%s/#", client_id);
    Serial.println(subsstring);
    mqttclient.subscribe(subsstring);
    //    JsonObject& root = jsonBuffer.createObject();
    //    root["client_id"] = client_id;
    //    char buffer[50];
    //    root.printTo(buffer, sizeof(buffer));
    //    mqttclient.publish("/pres/", buffer);
    long ms = millis();
    while (state == 1) {
      mqttreconnect();
      mqttclient.loop();
      delay(50);
      if ((millis() - ms) > 3000) {
        ms = millis();
        digitalWrite(LED, 1);
        delay(100);
        digitalWrite(LED, 0);
      }
      // wait for callback
    }
    // now we should have an authcode. Now we need to wait for the refresh token
    Serial.println("waiting for refresh");
    while (state == 2) {
      mqttclient.loop();
      //delay(100);
      // wait for callback
    }
  } else if (state == 3) {
    // normal running boot up
    //    mqttclient.setServer(oauthing, 1883).setCallback(callback);
    mqttreconnect();
    char subsstring[50] = {0};
    sprintf(subsstring, "/cid/%s/#", client_id);
    Serial.println(subsstring);
    mqttclient.subscribe(subsstring);
    StaticJsonBuffer<BUFFER_SIZE> jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    //    root["client_id"] = client_id;
    //    root["client_secret"] = client_secret;
    root["grant_type"] = "refresh_token";
    root["refresh_token"] = refreshtoken;
    char buffer[300];
    root.printTo(buffer, sizeof(buffer));
    mqttclient.publish("/token", buffer);
    while (!configured) {
      // add led blink here
      mqttclient.loop();
      delay(20);
      // wait for callback
    }
    // state 4 = working.
    digitalWrite(LED, 1);
    delay(100);
    digitalWrite(LED, 0);
    delay(100);
    digitalWrite(LED, 1);
    delay(100);
    digitalWrite(LED, 0);


    Serial.println("I'm ready!");
    Serial.print("access token: ");
    Serial.println(accesstoken);

    Serial.println("connecting to ignite");
    mqttclient.disconnect();
    mqttreconnect();
    mqttclient.subscribe("/c/led0");



    return; // now we can loop
  }

}


boolean longpress = false;

void loop() {
  // put your main code here, to run repeatedly:
  mqttreconnect();

  b.read();

  if (b.pressedFor(2000)) {
    longpress = true;
  }
  if (b.wasReleased()) {
    if (longpress) {
      mqttclient.publish("/d/button0", "{ \"longpress\": true }");
    }
    else {
      mqttclient.publish("/d/button0", "{ \"shortpress\": true }");
    }
    longpress = false;
  }
  mqttclient.loop();
  delay(10);
}



