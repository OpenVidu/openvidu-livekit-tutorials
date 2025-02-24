package io.openvidu.java.controllers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;

import io.livekit.server.EgressServiceClient;
import io.livekit.server.EncodedOutputs;
import jakarta.annotation.PostConstruct;
import livekit.LivekitEgress.DirectFileOutput;
import livekit.LivekitEgress.EgressInfo;
import livekit.LivekitEgress.EncodedFileOutput;
import livekit.LivekitEgress.EncodedFileType;
import livekit.LivekitEgress.StreamOutput;
import livekit.LivekitEgress.StreamProtocol;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/egresses")
public class EgressController {

    private static final Logger LOGGER = LoggerFactory.getLogger(EgressController.class);

    @Value("${livekit.url}")
    private String LIVEKIT_URL;

    @Value("${livekit.api.key}")
    private String LIVEKIT_API_KEY;

    @Value("${livekit.api.secret}")
    private String LIVEKIT_API_SECRET;

    private EgressServiceClient egressClient;

    @PostConstruct
    public void init() {
        egressClient = EgressServiceClient.createClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    }

    /**
     * Create a new RoomComposite egress
     * 
     * @param params JSON object with roomName
     * @return JSON object with the created egress
     */
    @PostMapping("/room-composite")
    public ResponseEntity<Map<String, Object>> createRoomCompositeEgress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");

        if (roomName == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' is required"));
        }

        try {
            EncodedFileOutput output = EncodedFileOutput.newBuilder()
                    .setFilepath("{room_name}-{room_id}-{time}")
                    .setFileType(EncodedFileType.MP4)
                    .build();
            EgressInfo egress = egressClient.startRoomCompositeEgress(roomName, output, "grid")
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating RoomComposite egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new RoomComposite egress to stream to a URL
     * 
     * @param params JSON object with roomName and streamUrl
     * @return JSON object with the created egress
     */
    @PostMapping("/stream")
    public ResponseEntity<Map<String, Object>> createStreamEgress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String streamUrl = params.get("streamUrl");

        if (roomName == null || streamUrl == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' and 'streamUrl' are required"));
        }

        try {
            StreamOutput output = StreamOutput.newBuilder()
                    .setProtocol(StreamProtocol.RTMP)
                    .addUrls(streamUrl)
                    .build();
            EgressInfo egress = egressClient.startRoomCompositeEgress(roomName, output, "grid")
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating RoomComposite egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new Participant egress
     * 
     * @param params JSON object with roomName and participantIdentity
     * @return JSON object with the created egress
     */
    @PostMapping("/participant")
    public ResponseEntity<Map<String, Object>> createParticipantEgress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String participantIdentity = params.get("participantIdentity");

        if (roomName == null || participantIdentity == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' and 'participantIdentity' are required"));
        }

        try {
            EncodedFileOutput output = EncodedFileOutput.newBuilder()
                    .setFilepath("{room_name}-{room_id}-{publisher_identity}-{time}")
                    .setFileType(EncodedFileType.MP4)
                    .build();
            EncodedOutputs outputs = new EncodedOutputs(output, null, null, null);
            EgressInfo egress = egressClient.startParticipantEgress(roomName, participantIdentity, outputs, false)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating Participant egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new TrackComposite egress
     * 
     * @param params JSON object with roomName, videoTrackId and audioTrackId
     * @return JSON object with the created egress
     */
    @PostMapping("/track-composite")
    public ResponseEntity<Map<String, Object>> createTrackCompositeEgress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String videoTrackId = params.get("videoTrackId");
        String audioTrackId = params.get("audioTrackId");

        if (roomName == null || videoTrackId == null || audioTrackId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName', 'videoTrackId' and 'audioTrackId' are required"));
        }

        try {
            EncodedFileOutput output = EncodedFileOutput.newBuilder()
                    .setFilepath("{room_name}-{room_id}-{publisher_identity}-{time}")
                    .setFileType(EncodedFileType.MP4)
                    .build();
            EgressInfo egress = egressClient.startTrackCompositeEgress(roomName, output, audioTrackId, videoTrackId)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating TrackComposite egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new Track egress
     * 
     * @param params JSON object with roomName and trackId
     * @return JSON object with the created egress
     */
    @PostMapping("/track")
    public ResponseEntity<Map<String, Object>> createTrackEgress(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");
        String trackId = params.get("trackId");

        if (roomName == null || trackId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' and 'trackId' are required"));
        }

        try {
            DirectFileOutput output = DirectFileOutput.newBuilder()
                    .setFilepath("{room_name}-{room_id}-{publisher_identity}-{track_source}-{track_id}-{time}")
                    .build();
            EgressInfo egress = egressClient.startTrackEgress(roomName, output, trackId)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating Track egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Create a new Web egress
     * 
     * @param params JSON object with url
     * @return JSON object with the created egress
     */
    @PostMapping("/web")
    public ResponseEntity<Map<String, Object>> createWebEgress(@RequestBody Map<String, String> params) {
        String url = params.get("url");

        if (url == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'url' is required"));
        }

        try {
            EncodedFileOutput output = EncodedFileOutput.newBuilder()
                    .setFilepath("{time}")
                    .setFileType(EncodedFileType.MP4)
                    .build();
            EgressInfo egress = egressClient.startWebEgress(url, output)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error creating Web egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * List egresses
     * If an egress ID is provided, only that egress is listed
     * If a room name is provided, only egresses for that room are listed
     * If active is true, only active egresses are listed
     * 
     * @param egressId Optional egress ID to filter
     * @param roomName Optional room name to filter
     * @param active   Optional flag to filter active egresses
     * @return JSON object with the list of egresses
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listEgresses(@RequestParam(required = false) String egressId,
            @RequestParam(required = false) String roomName, @RequestParam(required = false) Boolean active) {
        try {
            List<EgressInfo> egresses = egressClient.listEgress(roomName, egressId, active)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egresses", convertListToJson(egresses)));
        } catch (Exception e) {
            String errorMessage = "Error listing egresses";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Update egress layout
     * 
     * @param params JSON object with layout
     * @return JSON object with the updated egress
     */
    @PostMapping("/{egressId}/layout")
    public ResponseEntity<Map<String, Object>> updateEgressLayout(@PathVariable String egressId,
            @RequestBody Map<String, String> params) {
        String layout = params.get("layout");

        if (layout == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'layout' is required"));
        }

        try {
            EgressInfo egress = egressClient.updateLayout(egressId, layout)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error updating egress layout";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Add/remove stream URLs to an egress
     * 
     * @param params JSON object with streamUrlsToAdd and streamUrlsToRemove
     * @return JSON object with the updated egress
     */
    @PostMapping("/{egressId}/streams")
    public ResponseEntity<Map<String, Object>> updateEgressStream(@PathVariable String egressId,
            @RequestBody Map<String, Object> params) {
        Object streamUrlsToAddObj = params.get("streamUrlsToAdd");
        Object streamUrlsToRemoveObj = params.get("streamUrlsToRemove");

        if (!isStringList(streamUrlsToAddObj) || !isStringList(streamUrlsToRemoveObj)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage",
                            "'streamUrlsToAdd' and 'streamUrlsToRemove' are required and must be arrays"));
        }

        List<String> streamUrlsToAdd = convertToStringList(streamUrlsToAddObj);
        List<String> streamUrlsToRemove = convertToStringList(streamUrlsToRemoveObj);

        try {
            EgressInfo egress = egressClient.updateStream(egressId, streamUrlsToAdd, streamUrlsToRemove)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("egress", convertToJson(egress)));
        } catch (Exception e) {
            String errorMessage = "Error updating egress streams";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Stop an egress
     * 
     * @return JSON object with success message
     */
    @DeleteMapping("/{egressId}")
    public ResponseEntity<Map<String, Object>> stopEgress(@PathVariable String egressId) {
        try {
            egressClient.stopEgress(egressId)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Egress stopped"));
        } catch (Exception e) {
            String errorMessage = "Error stopping egress";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    private Map<String, Object> convertToJson(EgressInfo egress)
            throws InvalidProtocolBufferException, JsonProcessingException, JsonMappingException {
        ObjectMapper objectMapper = new ObjectMapper();
        String rawJson = JsonFormat.printer().print(egress);
        Map<String, Object> json = objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
        });
        return json;
    }

    private List<Map<String, Object>> convertListToJson(List<EgressInfo> egresses) {
        List<Map<String, Object>> jsonList = egresses.stream().map(egress -> {
            try {
                return convertToJson(egress);
            } catch (Exception e) {
                LOGGER.error("Error parsing egress", e);
                return null;
            }
        }).toList();
        return jsonList;
    }

    private boolean isStringList(Object obj) {
        return obj instanceof List<?> list && list.stream().allMatch(String.class::isInstance);
    }

    private List<String> convertToStringList(Object obj) {
        return ((List<?>) obj).stream()
                .map(String.class::cast)
                .toList();
    }
}
