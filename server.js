var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var fs = require('fs');
var mqtt = require('mqtt');

// Run the webserver on port 8080
server.listen(8080);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Add Socket.io clients
io.on('connection', function (socket) {

  socket.on('start', function (data) {
    var appEUI = data.appEUI;
    console.log('Connecting to AppEUI: ' + appEUI);

    // Start TTN MQTT connection
    var client = mqtt.connect('tcp://staging.thethingsnetwork.org:1883',
              { username: appEUI, password: data.accessKey });

    // Forward connection ok
    client.on('connect', function (msg) {
      console.log('Connected to TTN MQTT');
      socket.emit('ttn-connect', {})
      client.subscribe("+/devices/+/up");
    });

    // Forward uplink messages
    client.on('message', function (topic, buffer) {
      console.log('Uplink from topic: ' + topic)
      var message = JSON.parse(new Buffer(buffer, 'base64').toString('ascii'));
      message.payload_decrypted = new Buffer(message.payload, 'base64').toString('ascii');
      socket.emit('uplink', message)
    });

    // Forward errors
    client.on('error', function (err) {
      console.log('Error: ' + err);
      socket.emit('ttn-error', { message: err.message });
    });

    // Close the TTN client on exit
    socket.on('disconnect', function () {
      client.end();
      console.log('Disconnected');
    });
  });

});
