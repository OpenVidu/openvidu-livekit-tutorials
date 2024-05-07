package io.openvidu.recording.java;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.ResourceUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import org.json.JSONObject;

import io.livekit.server.*;
import livekit.LivekitEgress;
import livekit.LivekitEgress.EgressInfo;

import livekit.LivekitEgress.EncodedFileOutput;
import livekit.LivekitEgress.EncodedFileType;
import livekit.LivekitEgress.EncodedFileOutput.Builder;

@CrossOrigin(origins = "*")
@RestController
public class MyRestController {

	@Value("${LIVEKIT_URL}")
	private String LIVEKIT_URL;

	@Value("${LIVEKIT_API_KEY}")
	private String LIVEKIT_API_KEY;

	@Value("${LIVEKIT_API_SECRET}")
	private String LIVEKIT_API_SECRET;

	@Value("${RECORDINGS_PATH}")
	private String RECORDINGS_PATH;

	// OpenVidu object as entrypoint of the SDK
	private EgressServiceClient egressClient;

	@PostConstruct()
	public void initialize() {

		String livekitUrlHostname = LIVEKIT_URL.replaceFirst("^ws:", "http:").replaceFirst("^wss:", "https:");
		this.egressClient = EgressServiceClient.create(livekitUrlHostname, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, true);
	}

	/*******************/
	/*** Session API ***/
	/*******************/

	/**
	 * @param params The JSON object with roomName and participantName
	 * @return The JWT token
	 */
	@PostMapping("/token")
	public ResponseEntity<?> getToken(@RequestBody(required = true) Map<String, String> params) {
		String roomName = params.get("roomName");
		String participantName = params.get("participantName");
		JSONObject response = new JSONObject();

		if (roomName == null || participantName == null) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		// By default, tokens expire 6 hours after generation.
		// You may override this by using token.setTtl(long millis).
		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setName(participantName);
		token.setIdentity(participantName);

		JSONObject metadata = new JSONObject();
		metadata.put("livekitUrl", LIVEKIT_URL);
		// add metadata to the token, which will be available in the participant's
		// metadata
		token.setMetadata(metadata.toString());
		token.addGrants(new RoomJoin(true), new RoomName(roomName));

		response.put("token", token.toJwt());
		return new ResponseEntity<>(response.toMap(), HttpStatus.OK);
	}

	/*******************/
	/** Recording API **/
	/*******************/

	@RequestMapping(value = "/recordings/start", method = RequestMethod.POST)
	public ResponseEntity<?> startRecording(@RequestBody Map<String, Object> params) {
		try {
			String roomName = (String) params.get("roomName");
			String outputMode = (String) params.get("outputMode");
			Boolean videoOnly = (Boolean) params.get("videoOnly");
			Boolean audioOnly = (Boolean) params.get("audioOnly");
			String audioTrackId = (String) params.get("audioTrackId");
			String videoTrackId = (String) params.get("videoTrackId");

			Builder outputBuilder = LivekitEgress.EncodedFileOutput.newBuilder()
					.setFileType(EncodedFileType.DEFAULT_FILETYPE)
					.setFilepath("/recordings/" + roomName + "-" + new Date().getTime())
					.setDisableManifest(true);

			EncodedFileOutput output = outputBuilder.build();

			System.out.println("Starting recording " + roomName);

			LivekitEgress.EgressInfo egressInfo;

			if ("COMPOSED".equals(outputMode)) {

				System.out.println("Starting COMPOSED recording " + roomName);
				egressInfo = this.egressClient
						.startRoomCompositeEgress(roomName, output, "grid", null, null, audioOnly, videoOnly)
						.execute().body();
			} else if ("INDIVIDUAL".equals(outputMode)) {
				System.out.println("Starting INDIVIDUAL recording " + roomName);
				egressInfo = this.egressClient.startTrackCompositeEgress(roomName, output, audioTrackId, videoTrackId)
						.execute().body();
			} else {
				return ResponseEntity.badRequest().body("outputMode is required");
			}

			return ResponseEntity.ok().body(generateEgressInfoResponse(egressInfo));

		} catch (Exception e) {
			System.out.println("Error starting recording " + e.getMessage());
			return ResponseEntity.badRequest().body("Error starting recording");
		}
	}

	@RequestMapping(value = "/recordings/stop", method = RequestMethod.POST)
	public ResponseEntity<?> stopRecording(@RequestBody Map<String, Object> params) {

		String recordingId = (String) params.get("recordingId");

		if (recordingId == null) {
			return ResponseEntity.badRequest().body("recordingId is required");
		}

		System.out.println("Stoping recording | {recordingId}=" + recordingId);

		try {
			LivekitEgress.EgressInfo egressInfo = this.egressClient.stopEgress(recordingId).execute().body();
			return ResponseEntity.ok().body(generateEgressInfoResponse(egressInfo));
		} catch (Exception e) {
			System.out.println("Error stoping recording " + e.getMessage());
			return ResponseEntity.badRequest().body("Error stoping recording");
		}
	}

	@RequestMapping(value = "/recordings", method = RequestMethod.DELETE)
	public ResponseEntity<?> deleteRecordings() {

		try {
			File recordingsDir = ResourceUtils.getFile("classpath:static");
			deleteFiles(new File(RECORDINGS_PATH));
			deleteFiles(new File(recordingsDir.getAbsolutePath()));
			JSONObject response = new JSONObject();
			response.put("message", "All recordings deleted");

			return ResponseEntity.ok().body(response.toMap());
		} catch (IOException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting recordings");
		}
	}

	@RequestMapping(value = "/recordings/list", method = RequestMethod.GET)
	public ResponseEntity<?> listRecordings() {

		System.out.println("Listing recordings");

		List<JSONObject> recordings = new ArrayList<>();

		try {
			File recordingsDir = ResourceUtils.getFile("classpath:static");
			Files.walk(Path.of(RECORDINGS_PATH)).forEach(filePath -> {
				JSONObject recordingsMap = new JSONObject();

				if (Files.isRegularFile(filePath)) {
					String fileName = filePath.getFileName().toString();
					String destinationPath = recordingsDir.getAbsolutePath() + File.separator + fileName;

					try {
						Files.copy(filePath, Path.of(destinationPath), StandardCopyOption.REPLACE_EXISTING);
					} catch (IOException e) {
						e.printStackTrace();
					}

					recordingsMap.put("name", fileName);
					recordingsMap.put("path", "/" + fileName);

					recordings.add(recordingsMap);
				}
			});
		} catch (IOException e) {
			e.printStackTrace();
			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}

		JSONObject response = new JSONObject();
		response.put("recordings", recordings);
		return new ResponseEntity<>(response.toMap(), HttpStatus.OK);
	}

	private void deleteFiles(File directory) {
		if (directory.exists() && directory.isDirectory()) {
			File[] files = directory.listFiles();
			if (files != null) {
				for (File file : files) {
					if (file.isDirectory()) {
						deleteFiles(file);
					} else {
						if (file.delete()) {
							System.out.println("Deleted file: " + file.getAbsolutePath());
						} else {
							System.out.println("Failed to delete file: " + file.getAbsolutePath());
						}
					}
				}
			}
		}
	}

	private Map<String, Object> generateEgressInfoResponse(EgressInfo egressInfo) {
		JSONObject info = new JSONObject();
		JSONObject response = new JSONObject();

		info.put("egressId", egressInfo.getEgressId());
		info.put("roomName", egressInfo.getRoomName());
		info.put("status", egressInfo.getStatus().toString());

		response.put("info", info);
		return response.toMap();

	}

}
