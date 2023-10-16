package io.openvidu.basic.java;

import java.util.Map;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.livekit.server.*;

@CrossOrigin(origins = "*")
@RestController
public class Controller {

	@Value("${LIVEKIT_URL}")
	private String LIVEKIT_URL;

	@Value("${LIVEKIT_API_KEY}")
	private String LIVEKIT_API_KEY;

	@Value("${LIVEKIT_API_SECRET}")
	private String LIVEKIT_API_SECRET;

	/**
	 * @param params The JSON object with roomName and participantName
	 * @return The JWT token
	 */
	@PostMapping("/token")
	public ResponseEntity<String> getToken(@RequestBody(required = true) Map<String, String> params) {
		String roomName = params.get("roomName");
		String participantName = params.get("participantName");

		if(roomName == null || participantName == null) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		// By default, tokens expire 6 hours after generation.
		// You may override this by using token.setTtl(long millis).
		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setName(participantName);
		token.setIdentity(participantName);


        JSONObject metadata = new JSONObject();
        metadata.put("livekitUrl", LIVEKIT_URL);
		// add metadata to the token, which will be available in the participant's metadata
		token.setMetadata(metadata.toString());
		token.addGrants(new RoomJoin(true), new RoomName(roomName));

		return new ResponseEntity<>(token.toJwt(), HttpStatus.OK);
	}

}
