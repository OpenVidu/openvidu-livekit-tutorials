/* CONFIGURATION */
require('dotenv').config(
	!!process.env.CONFIG ? { path: process.env.CONFIG } : {}
);
// For demo purposes we ignore self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Node imports
const express = require('express');
const fs = require('fs');
var path = require('path');
const https = require('https');
const bodyParser = require('body-parser');
const AccessToken = require('livekit-server-sdk').AccessToken;
const EgressClient = require('livekit-server-sdk').EgressClient;
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
// Environment variable: path where the recordings will be stored
const RECORDINGS_PATH = process.env.RECORDINGS_PATH || '/recordings';

// Listen (start app with node server.js)
const options = {
	key: fs.readFileSync('openvidukey.pem'),
	cert: fs.readFileSync('openviducert.pem'),
};

const livekitUrlHostname = LIVEKIT_URL.replace(/^ws:/, 'http:').replace(
	/^wss:/,
	'https:'
);
const egressClient = new EgressClient(
	livekitUrlHostname,
	LIVEKIT_API_KEY,
	LIVEKIT_API_SECRET
);

// Enable CORS support
app.use(
	cors({
		origin: '*',
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

/* Session API */

app.post('/token', (req, res) => {
	const { roomName, participantName } = req.body;

	console.log(
		`Getting a token for room '${roomName}' and participant '${participantName}'`
	);

	if (!roomName || !participantName) {
		res
			.status(400)
			.json({ message: 'roomName and participantName are required' });
		return;
	}

	const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity: participantName,
		// add metadata to the token, which will be available in the participant's metadata
		metadata: JSON.stringify({ livekitUrl: LIVEKIT_URL }),
	});
	at.addGrant({
		roomJoin: true,
		room: roomName,
	});
	res.status(200).json({ token: at.toJwt() });
});

/* Recording API */

// Start recording
app.post('/recordings/start', async function (req, res) {
	const {
		roomName,
		outputMode,
		videoOnly,
		audioOnly,
		audioTrackId,
		videoTrackId,
	} = req.body;
	const output = {
		fileType: 0, // file type chosen based on codecs
		filepath: `/recordings/${roomName}-${new Date().getTime()}`,
		disableManifest: true,
	};
	console.log('Starting recording', roomName);
	try {
		let egressInfo;
		if (outputMode === 'COMPOSED') {
			console.log('Starting COMPOSED recording', roomName);
			egressInfo = await egressClient.startRoomCompositeEgress(
				roomName,
				output,
				{
					layout: 'grid',
					audioOnly,
					videoOnly,
				}
			);
		} else if (outputMode === 'INDIVIDUAL') {
			console.log('Starting INDIVIDUAL recording', roomName);
			egressInfo = await egressClient.startTrackCompositeEgress(
				roomName,
				output,
				{
					audioTrackId,
					videoTrackId,
				}
			);
		} else {
			res.status(400).json({ message: 'outputMode is required' });
			return;
		}
		res.status(200).json({ message: 'recording started', info: egressInfo });
	} catch (error) {
		console.log('Error starting recording', error);
		res.status(200).json({ message: 'error starting recording' });
	}
});

// Stop recording
app.post('/recordings/stop', async function (req, res) {
	const recordingId = req.body.recordingId;
	try {
		if (!recordingId) {
			res.status(400).json({ message: 'recordingId is required' });
			return;
		}

		console.log(`Stopping recording ${recordingId}`);
		const egressInfo = await egressClient.stopEgress(recordingId);
		res.status(200).json({ message: 'recording stopped', info: egressInfo });
	} catch (error) {
		console.log('Error stopping recording', error);
		res.status(200).json({ message: 'error stopping recording' });
	}
});

// List all recordings
app.get('/recordings/list', function (req, res) {
	const recordings = [];
	fs.readdirSync(RECORDINGS_PATH, { recursive: true }).forEach((value) => {
		// copy file to public folder for development purposes
		fs.copyFileSync(`${RECORDINGS_PATH}/${value}`, `public/${value}`);
		const newRec = { name: value, path: `/${value}` };
		recordings.push(newRec);
	});
	console.log(recordings);
	res.status(200).json({ recordings });
});

// Delete all recordings
app.delete('/recordings', function (req, res) {
	fs.readdirSync(RECORDINGS_PATH, { recursive: true }).forEach((value) => {
		fs.unlinkSync(`${RECORDINGS_PATH}/${value}`);
		if (fs.existsSync(`public/${value}`)) {
			fs.unlinkSync(`public/${value}`);
		}
	});
	res.status(200).json({ message: 'All recordings deleted' });
});
