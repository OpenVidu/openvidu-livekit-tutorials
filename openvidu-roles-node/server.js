/* CONFIGURATION */
require('dotenv').config(
	!!process.env.CONFIG ? { path: process.env.CONFIG } : {}
);
// For demo purposes we ignore self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Node imports
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const https = require('https');
const bodyParser = require('body-parser');
const AccessToken = require('livekit-server-sdk').AccessToken;
const cors = require('cors');
const app = express();

// Environment variable: PORT where the node server is listening
const SERVER_PORT = process.env.SERVER_PORT || 5000;
// Environment variable: api key shared with our LiveKit deployment
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
// Environment variable: api secret shared with our LiveKit deployment
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
// Environment variable: url of our LiveKit deployment
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

// Listen (start app with node server.js)
const options = {
	key: fs.readFileSync('openvidukey.pem'),
	cert: fs.readFileSync('openviducert.pem'),
};

// The users of our application
// They should be stored in a database
const users = [
	{
		user: 'publisher1',
		pass: 'pass',
		role: 'PUBLISHER',
	},
	{
		user: 'publisher2',
		pass: 'pass',
		role: 'PUBLISHER',
	},
	{
		user: 'subscriber',
		pass: 'pass',
		role: 'SUBSCRIBER',
	},
];

// Enable CORS support
app.use(
	cors({
		origin: '*',
	})
);

// Server configuration
app.use(
	session({
		saveUninitialized: true,
		resave: false,
		secret: 'MY_SECRET',
	})
);
// Set the static files location
app.use(express.static(__dirname + '/public'));
// Parse application/x-www-form-urlencoded
app.use(
	bodyParser.urlencoded({
		extended: 'true',
	})
);
// Parse application/json
app.use(bodyParser.json());

// Parse application/vnd.api+json as json
app.use(
	bodyParser.json({
		type: 'application/vnd.api+json',
	})
);

https.createServer(options, app).listen(SERVER_PORT, () => {
	console.log(`App listening on port ${SERVER_PORT}`);
	console.log(`LIVEKIT API KEY: ${LIVEKIT_API_KEY}`);
	console.log(`LIVEKIT API SECRET: ${LIVEKIT_API_SECRET}`);
	console.log(`LIVEKIT URL: ${LIVEKIT_URL}`);
	console.log();
	console.log('Access the app at https://localhost:' + SERVER_PORT);
});

/* CONFIGURATION */

/* REST API */

app.post('/login', (req, res) => {
	// Retrieve params from body
	const { user, pass } = req.body;

	if (login(user, pass)) {
		// Successful login
		// Validate session and return OK
		// Value stored in req.session allows us to identify the user in future requests
		console.log(`Successful login for user '${user}'`);
		req.session.loggedUser = user;
		res.status(200).json({});
	} else {
		// Credentials are NOT valid
		// Invalidate session and return error
		console.log(`Invalid credentials for user '${user}'`);
		req.session.destroy();
		res.status(401).json({ message: 'Invalid credentials' });
	}
});

app.post('/logout', function (req, res) {
	console.log(`'${req.session.loggedUser}' has logged out`);
	req.session.destroy();
	res.status(200).json({});
});

app.post('/token', (req, res) => {
	const {roomName, participantName} = req.body;

	if (!isLogged(req.session)) {
		req.session.destroy();
		res.status(401).json({ message: 'User not logged' });
		return;
	}

	console.log(
		`Getting a token for room '${roomName}' and participant '${participantName}'`
	);

	if (!roomName || !participantName) {
		res
			.status(400)
			.json({ message: 'roomName and participantName are required' });
		return;
	}

	const user = users.find((u) => u.user === req.session.loggedUser);
	const {role, user: nickname} = user;
	const canPublish = role === 'PUBLISHER';
	const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity: participantName,
		// add metadata to the token, which will be available in the participant's metadata
		metadata: JSON.stringify({ livekitUrl: LIVEKIT_URL, nickname, role }),
	});
	at.addGrant({
		roomJoin: true,
		room: roomName,
		canPublish,
		canSubscribe: true,
	});
	res.status(200).json({ token: at.toJwt() });
});

/* REST API */

/* AUXILIARY METHODS */

function login(user, pass) {
	return users.find((u) => u.user === user && u.pass === pass);
}

function isLogged(session) {
	return session.loggedUser != null;
}


/* AUXILIARY METHODS */
