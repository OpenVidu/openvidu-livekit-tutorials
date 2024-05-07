package io.openvidu.js.java;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpSession;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;

import io.openvidu.js.java.LoginController.MyUser;

@CrossOrigin(origins = "*")
@RestController
public class RoomController {

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
	public ResponseEntity<Map<String, String>> getToken(@RequestBody(required = true) Map<String, String> params, HttpSession httpSession) {

		String roomName = params.get("roomName");
		String participantName = params.get("participantName");
		Map<String, String> response = new HashMap<String, String>();

		if(!isUserLogged(httpSession)) {
			response.put("message", "User is not logged");
			return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
		}

		if(roomName == null || participantName == null) {
			response.put("message", "roomName and participantName are required");
			return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
		}

		MyUser user = LoginController.users.get(httpSession.getAttribute("loggedUser"));
		Boolean canPublish = user.role.equals("PUBLISHER");

		// By default, tokens expire 6 hours after generation.
		// You may override this by using token.setTtl(long millis).
		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setName(participantName);
		token.setIdentity(participantName);

		JSONObject metadata = new JSONObject();
		metadata.put("livekitUrl", LIVEKIT_URL);
		metadata.put("user", user.name);
		metadata.put("role", user.role);
		// add metadata to the token, which will be available in the participant's metadata
		token.setMetadata(metadata.toString());
		token.addGrants(new RoomJoin(true), new RoomName(roomName), new CanPublish(canPublish), new CanSubscribe(true));

		response.put("token", token.toJwt());
		return new ResponseEntity<>(response, HttpStatus.OK);
	}


	private boolean isUserLogged(HttpSession httpSession) {
		return httpSession != null && httpSession.getAttribute("loggedUser") != null;
	}

}
