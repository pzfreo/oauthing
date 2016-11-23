# basic plan
#
# client_id, client_secret and device id are embedded.
#
# Listen on device_id
# wait for authcode
# then issue token request.
# store refresh and code
# done.
#

import paho.mqtt.client as mqtt
import httplib2
import base64
import json
from urllib import urlencode
import webbrowser
from io import BytesIO
from io import StringIO
# import Image

import pyqrcode
server= "https://oauthing.io/"


register_url = server+"register"
token_url = server+"oauth/token"
redirect_uri = server+"callback"

# regreq = dict(redirect_uris = [redirect_uri], client_name= "IoTClient-"+deviceid, token_endpoint_auth_method="client_secret_post")
# hr = httplib2.Http(disable_ssl_certificate_validation=True)
# resp, content = hr.request(register_url, "POST", body=json.dumps(regreq),
#     headers={'content-type':'application/json'})



def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))

    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe("/mfr/pres")

def on_message(client,userdata,msg):
  print("on message "+msg.topic)
  seen = userdata['seen']
  
  if (msg.topic=="/mfr/pres"):
	print (msg.payload)
  	deviceid = str(json.loads(msg.payload)['d'])
#   	if (deviceid in seen):
#   		return
 
	seen.add(deviceid)
	client.user_data_set({'seen':seen})
	regreq = dict(redirect_uris = [redirect_uri], client_name= "IoTClient-"+deviceid, token_endpoint_auth_method="client_secret_post")
	hr = httplib2.Http(disable_ssl_certificate_validation=True)
	resp, content = hr.request(register_url, "POST", body=json.dumps(regreq),
		headers={'content-type':'application/json'})

	print (resp)
	print (content)

	respdict = json.loads(content.decode('utf-8'))

	clientid = respdict['client_id']
	clientsecret = respdict['client_secret']
	d = dict()

	d['client_id']= clientid
	d['client_secret']= clientsecret
	d['tokenserver'] = "oauthing.io"

	client.publish("/dev/"+deviceid+"/cc", payload=json.dumps(d));

# 	red =  server+"dialog/authorize?client_id="+clientid+"&scope=offline_access&redirect_uri="+redirect_uri+"&state="+clientid+"&response_type=code"
	red = server+"r?cid="+clientid;
	print (red);
	
	big_code = pyqrcode.create(red)
	#, error='L', version=27)

	print("qr code created");
	buffer = BytesIO()
	big_code.png(buffer, scale=4)
	
	

	b64 = base64.b64encode(buffer.getvalue()).decode()
	# # print(b64)
	imageurl = "data:image/png;base64,"+b64
	print ("about to open browser");
	print (imageurl)
	webbrowser.open(imageurl)

	print(red);




#
#
#   h = httplib2.Http( disable_ssl_certificate_validation=True)
# #  auth = base64.encodestring( clientid + ':' + clientsecret )
#   data = dict(grant_type="authorization_code", code=acdict['code'], client_id=clientid, client_secret=clientsecret, # state="002",
#             redirect_uri=redirect_uri);
#   print (urlencode(data))
# #  authheader = "Basic "+auth
#   resp, content = h.request(token_url, "POST", body=urlencode(data),
#     headers={'content-type':'application/x-www-form-urlencoded'}) #,'Authorization' : authheader } )
#   print (resp)
#   response=json.loads(content.decode())
#   print (response)
#   client.publish("/ready/"+deviceid, payload="done");

client = mqtt.Client()
client.user_data_set({ "seen": set()})
client.on_message = on_message
client.on_connect = on_connect
client.connect("oauthing.io", 1883, 60)
print ("waiting")
client.loop_forever()
