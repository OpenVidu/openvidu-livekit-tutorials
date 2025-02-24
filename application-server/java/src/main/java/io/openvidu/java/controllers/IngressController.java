package io.openvidu.java.controllers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;

import io.livekit.server.IngressServiceClient;
import jakarta.annotation.PostConstruct;
import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitIngress.IngressInput;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/ingresses")
public class IngressController {

    private static final Logger LOGGER = LoggerFactory.getLogger(IngressController.class);

    @Value("${livekit.url}")
    private String LIVEKIT_URL;

    @Value("${livekit.api.key}")
    private String LIVEKIT_API_KEY;

    @Value("${livekit.api.secret}")
    private String LIVEKIT_API_SECRET;

    private IngressServiceClient ingressClient;

    @PostConstruct
    public void init() {
        ingressClient = IngressServiceClient.createClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    }

    /**
     * Create a new RTMP ingress
     * 
     * @param params JSON object with roomName and participantIdentity
     * @return JSON object with the created ingress
     */
    @PostMapping("/rtmp")
    public ResponseEntity<Map<String, Object>> createRTMPIngress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String participantIdentity = params.get("participantIdentity");

        if (roomName == null || participantIdentity == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' and 'participantIdentity' are required"));
        }

        try {
            IngressInfo ingress = ingressClient
                    .createIngress("rtmp-ingress", roomName, participantIdentity, null, IngressInput.RTMP_INPUT)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("ingress", convertToJson(ingress)));
        } catch (Exception e) {
            String errorMessage = "Error creating RTMP ingress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new WHIP ingress
     *
     * @param params JSON object with roomName and participantIdentity
     * @return JSON object with the created ingress
     */
    @PostMapping("/whip")
    public ResponseEntity<Map<String, Object>> createWHIPIngress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String participantIdentity = params.get("participantIdentity");

        if (roomName == null || participantIdentity == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' and 'participantIdentity' are required"));
        }

        try {
            IngressInfo ingress = ingressClient
                    .createIngress("whip-ingress", roomName, participantIdentity, null, IngressInput.WHIP_INPUT)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("ingress", convertToJson(ingress)));
        } catch (Exception e) {
            String errorMessage = "Error creating WHIP ingress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new URL ingress
     *
     * @param params JSON object with roomName, participantIdentity and url
     * @return JSON object with the created ingress
     */
    @PostMapping("/url")
    public ResponseEntity<Map<String, Object>> createURLIngress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String participantIdentity = params.get("participantIdentity");
        String url = params.get("url");

        if (roomName == null || participantIdentity == null || url == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName', 'participantIdentity' and 'url' are required"));
        }

        try {
            IngressInfo ingress = ingressClient
                    .createIngress("url-ingress", roomName, participantIdentity, null, IngressInput.URL_INPUT, null,
                            null, null, null, url)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("ingress", convertToJson(ingress)));
        } catch (Exception e) {
            String errorMessage = "Error creating URL ingress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * List ingresses
     * If an ingress ID is provided, only that ingress is listed
     * If a room name is provided, only ingresses for that room are listed
     * 
     * @param ingressId Optional ingress ID to filter
     * @param roomName  Optional room name to filter
     * @return JSON object with the list of ingresses
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listIngresses(@RequestParam(required = false) String ingressId,
            @RequestParam(required = false) String roomName) {
        try {
            List<IngressInfo> ingresses = ingressClient.listIngress(roomName, ingressId)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("ingresses", convertListToJson(ingresses)));
        } catch (Exception e) {
            String errorMessage = "Error listing ingresses";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Update ingress
     * 
     * @param params JSON object with roomName
     * @return JSON object with the updated ingress
     */
    @PatchMapping("/{ingressId}")
    public ResponseEntity<Map<String, Object>> updateIngress(@PathVariable String ingressId,
            @RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");

        if (roomName == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' is required"));
        }

        try {
            // Know bug: participantIdentity must be provided in order to not fail, but it is not used
            IngressInfo ingress = ingressClient.updateIngress(ingressId, "updated-ingress", roomName, "Ingress-Participant")
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("ingress", convertToJson(ingress)));
        } catch (Exception e) {
            String errorMessage = "Error updating ingress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Delete ingress
     * 
     * @return JSON object with success message
     */
    @DeleteMapping("/{ingressId}")
    public ResponseEntity<Map<String, Object>> deleteIngress(@PathVariable String ingressId) {
        try {
            ingressClient.deleteIngress(ingressId)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Ingress deleted"));
        } catch (Exception e) {
            String errorMessage = "Error deleting ingress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    private Map<String, Object> convertToJson(IngressInfo ingress)
            throws InvalidProtocolBufferException, JsonProcessingException, JsonMappingException {
        ObjectMapper objectMapper = new ObjectMapper();
        String rawJson = JsonFormat.printer().print(ingress);
        Map<String, Object> json = objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
        });
        return json;
    }

    private List<Map<String, Object>> convertListToJson(List<IngressInfo> ingresses) {
        List<Map<String, Object>> jsonList = ingresses.stream().map(ingress -> {
            try {
                return convertToJson(ingress);
            } catch (Exception e) {
                LOGGER.error("Error parsing ingress", e);
                return null;
            }
        }).toList();
        return jsonList;
    }
}
