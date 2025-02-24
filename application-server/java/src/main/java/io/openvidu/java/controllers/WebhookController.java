package io.openvidu.java.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.livekit.server.WebhookReceiver;
import jakarta.annotation.PostConstruct;
import livekit.LivekitWebhook.WebhookEvent;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping(value = "/livekit/webhook", consumes = "application/webhook+json")
public class WebhookController {

	private static final Logger LOGGER = LoggerFactory.getLogger(WebhookController.class);

	@Value("${livekit.api.key}")
	private String LIVEKIT_API_KEY;

	@Value("${livekit.api.secret}")
	private String LIVEKIT_API_SECRET;

	private WebhookReceiver webhookReceiver;

	@PostConstruct
	public void init() {
		webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
	}

	@PostMapping()
	public ResponseEntity<String> receiveWebhook(@RequestHeader("Authorization") String authHeader,
			@RequestBody String body) {
		try {
			WebhookEvent webhookEvent = webhookReceiver.receive(body, authHeader);
			System.out.println("LiveKit Webhook: " + webhookEvent.toString());
		} catch (Exception e) {
			LOGGER.error("Error validating webhook event", e);
		}

		return ResponseEntity.ok("ok");
	}
}
