require('dotenv').config(
	!!process.env.CONFIG ? { path: process.env.CONFIG } : {}
);
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var AccessToken = require('livekit-server-sdk').AccessToken;
var cors = require('cors');
var app = express();

// Environment variable: PORT where the node server is listening
var SERVER_PORT = process.env.SERVER_PORT || 5000;
// Environment variable: api key shared with our LiveKit deployment
var LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
// Environment variable: api secret shared with our LiveKit deployment
var LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// Enable CORS support
app.use(
	cors({
		origin: '*',
	})
);

var server = http.createServer(app);

// Allow application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// Allow application/json
app.use(bodyParser.json());

// Serve static resources if available
app.use(express.static(__dirname + '/public'));

// Serve application
server.listen(SERVER_PORT, () => {
	console.log('Application started on port: ', SERVER_PORT);
});

app.post('/token', (req, res) => {
	const roomName = req.body.roomName;
	const participantName = req.body.participantName;
	const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity: participantName,
	});
	at.addGrant({ roomJoin: true, room: roomName });
	const token = at.toJwt();
	res.send(token);
});

process.on('uncaughtException', (err) => console.error(err));
