package io.openvidu.java.controllers;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/token")
public class TokenController {

	@Value("${livekit.api.key}")
	private String LIVEKIT_API_KEY;

	@Value("${livekit.api.secret}")
	private String LIVEKIT_API_SECRET;

	/**
	 * Create a new token for a participant to join a room
	 * 
	 * @param params JSON object with roomName and participantName
	 * @return JSON object with the JWT token
	 */
	@PostMapping
	public ResponseEntity<Map<String, String>> createToken(@RequestBody Map<String, String> params) {
		String roomName = params.get("roomName");
		String participantName = params.get("participantName");

		if (roomName == null || participantName == null) {
			return ResponseEntity.badRequest()
					.body(Map.of("errorMessage", "'roomName' and 'participantName' are required"));
		}

		AccessToken token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		token.setName(participantName);
		token.setIdentity(participantName);
		token.addGrants(
				new RoomJoin(true),
				new RoomName(roomName),
				new CanPublish(true),
				new CanSubscribe(true));

		return ResponseEntity.ok(Map.of("token", token.toJwt()));
	}
}
