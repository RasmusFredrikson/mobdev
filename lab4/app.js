
// A Painter application that uses MQTT to distribute draw events
// to all other devices running this app.

//Object that holds application data and functions.
var app = {};

var host = 'vernemq.evothings.com';
var port = 8084;
var user = 'muffins';
var password = '';

app.connected = false;
app.ready = false;

// Simple function to generate a color from the device UUID
app.generateColor = function(uuid) {
	var code = parseInt(uuid.split('-')[0], 16)
	var blue = (code >> 16) & 31;
	var green = (code >> 21) & 31;
	var red = (code >> 27) & 31;
	return "rgb(" + (red << 3) + "," + (green << 3) + "," + (blue << 3) + ")"
}

app.initialize = function() {
	document.addEventListener(
		'deviceready',
		app.onReady,
		false);
}

app.onReady = function() {
	if (!app.ready) {
		app.color = app.generateColor(device.uuid); // Generate our own color from UUID
		app.pubTopic = '/dolphins/' + device.uuid + '/evt'; // We publish to our own device topic
		app.subTopic = '/dolphins/+/evt'; // We subscribe to all devices using "+" wildcard
		var username = window.prompt("Enter username: ");
		app.setupChat(username);
		app.setupConnection(username);
		app.ready = true;
	}
}

app.setupChat = function(username) {
	var confirmButton = document.getElementById("confirmButton");
	var message = document.getElementById("inputBox");	
	confirmButton.addEventListener("click", function(event) {
		if (app.connected) {
			var msg = JSON.stringify({user: username, message: message.value});
			app.publish(msg);
		}
	})
}

app.setupConnection = function(username) {
	app.status("Connecting to " + host + ":" + port + " as " + device.uuid);
	app.client = new Paho.MQTT.Client(host, port, device.uuid);
	app.client.onConnectionLost = app.onConnectionLost;
	app.client.onMessageArrived = app.onMessageArrived;
	var last_will = new Paho.MQTT.Message(JSON.stringify({user: username, message: "Nighty"}));
	last_will.destinationName = app.pubTopic;
	last_will.qos = 0;
	last_will.retained = false;
	var options = {
		willMessage: last_will,
		useSSL: true,
		onSuccess: app.onConnect,
		onFailure: app.onConnectFailure
	}
	app.client.connect(options);
}

app.publish = function(json) {
	message = new Paho.MQTT.Message(json);
	message.destinationName = app.pubTopic;
	message.qos = 2;
	message.retained = true;
	app.client.send(message);
};

app.subscribe = function() {
	app.client.subscribe(app.subTopic);
	console.log("Subscribed: " + app.subTopic);
}

app.unsubscribe = function() {
	app.client.unsubscribe(app.subTopic);
	console.log("Unsubscribed: " + app.subTopic);
}

app.onMessageArrived = function(message) {
	var o = JSON.parse(message.payloadString);
	var output = document.getElementById("messageBox");
	output.innerHTML += o.user + ": " + o.message + "\n";
	output.scrollTop = output.scrollHeight;
	var input = document.getElementById("inputBox");
	input.value = "";
}

app.onConnect = function(context) {
	app.subscribe();
	app.status("Connected!");
	app.connected = true;
}

app.onConnectFailure = function(e){
	console.log("Failed to connect: " + JSON.stringify(e));
}

app.onConnectionLost = function(responseObject) {
	app.status("Connection lost!");
	console.log("Connection lost: "+responseObject.errorMessage);
	app.connected = false;
}

app.status = function(s) {
	console.log(s);
	var info = document.getElementById("info");
	info.innerHTML = s;
}

app.initialize();
