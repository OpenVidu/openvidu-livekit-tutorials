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
import com.google.protobuf.MessageOrBuilder;
import com.google.protobuf.util.JsonFormat;

import io.livekit.server.RoomServiceClient;
import jakarta.annotation.PostConstruct;
import livekit.LivekitModels.Room;
import livekit.LivekitModels.TrackInfo;
import livekit.LivekitModels.DataPacket;
import livekit.LivekitModels.ParticipantInfo;
import livekit.LivekitModels.ParticipantPermission;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/rooms")
public class RoomController {

    private static final Logger LOGGER = LoggerFactory.getLogger(RoomController.class);

    @Value("${livekit.url}")
    private String LIVEKIT_URL;

    @Value("${livekit.api.key}")
    private String LIVEKIT_API_KEY;

    @Value("${livekit.api.secret}")
    private String LIVEKIT_API_SECRET;

    private RoomServiceClient roomClient;

    @PostConstruct
    public void init() {
        roomClient = RoomServiceClient.createClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    }

    /**
     * Create a new room
     * 
     * @param params JSON object with roomName
     * @return JSON object with the created room
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createRoom(@RequestBody Map<String, String> params) {
        String roomName = params.get("roomName");

        if (roomName == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'roomName' is required"));
        }

        try {
            Room room = roomClient.createRoom(roomName)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("room", convertToJson(room)));
        } catch (Exception e) {
            String errorMessage = "Error creating room";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * List rooms.
     * If a room name is provided, only that room is listed
     * 
     * @param roomName Optional room name to filter
     * @return JSON object with the list of rooms
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listRooms(@RequestParam(required = false) String roomName) {
        try {
            List<String> roomNames = roomName != null ? List.of(roomName) : null;
            List<Room> rooms = roomClient.listRooms(roomNames)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("rooms", convertListToJson(rooms)));
        } catch (Exception e) {
            String errorMessage = "Error listing rooms";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Update room metadata
     *
     * @param params JSON object with metadata
     * @return JSON object with the updated room
     */
    @PostMapping("/{roomName}/metadata")
    public ResponseEntity<Map<String, Object>> updateRoomMetadata(@PathVariable String roomName,
            @RequestBody Map<String, String> params) {
        String metadata = params.get("metadata");

        if (metadata == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'metadata' is required"));
        }

        try {
            Room room = roomClient.updateRoomMetadata(roomName, metadata)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("room", convertToJson(room)));
        } catch (Exception e) {
            String errorMessage = "Error updating room metadata";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Send data message to participants in a room
     * 
     * @param params JSON object with data
     * @return JSON object with success message
     */
    @PostMapping("/{roomName}/send-data")
    public ResponseEntity<Map<String, Object>> sendData(@PathVariable String roomName,
            @RequestBody Map<String, Object> params) {
        Object rawData = params.get("data");

        if (rawData == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'data' is required"));
        }

        try {
            ObjectMapper objectMapper = new ObjectMapper();
            byte[] data = objectMapper.writeValueAsBytes(rawData);
            roomClient.sendData(roomName, data, DataPacket.Kind.RELIABLE, List.of(), List.of(), "chat")
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Data message sent"));
        } catch (Exception e) {
            String errorMessage = "Error sending data message";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Delete a room
     * 
     * @return JSON object with success message
     */
    @DeleteMapping("/{roomName}")
    public ResponseEntity<Map<String, Object>> deleteRoom(@PathVariable String roomName) {
        try {
            roomClient.deleteRoom(roomName)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Room deleted"));
        } catch (Exception e) {
            String errorMessage = "Error deleting room";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * List participants in a room
     *
     * @return JSON object with the list of participants
     */
    @GetMapping("/{roomName}/participants")
    public ResponseEntity<Map<String, Object>> listParticipants(@PathVariable String roomName) {
        try {
            List<ParticipantInfo> participants = roomClient.listParticipants(roomName)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("participants", convertListToJson(participants)));
        } catch (Exception e) {
            String errorMessage = "Error getting participants";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Get a participant in a room
     *
     * @return JSON object with the participant
     */
    @GetMapping("/{roomName}/participants/{participantIdentity}")
    public ResponseEntity<Map<String, Object>> getParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity) {
        try {
            ParticipantInfo participant = roomClient.getParticipant(roomName, participantIdentity)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("participant", convertToJson(participant)));
        } catch (Exception e) {
            String errorMessage = "Error getting participant";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Update a participant in a room
     *
     * @param params JSON object with metadata (optional)
     * @return JSON object with the updated participant
     */
    @PatchMapping("/{roomName}/participants/{participantIdentity}")
    public ResponseEntity<Map<String, Object>> updateParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity, @RequestBody Map<String, String> params) {
        String metadata = params.get("metadata");

        try {
            ParticipantPermission permissions = ParticipantPermission.newBuilder()
                    .setCanPublish(false)
                    .setCanSubscribe(true)
                    .build();
            ParticipantInfo participant = roomClient
                    .updateParticipant(roomName, participantIdentity, null, metadata, permissions)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("participant", convertToJson(participant)));
        } catch (Exception e) {
            String errorMessage = "Error updating participant";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Remove a participant from a room
     *
     * @return JSON object with success message
     */
    @DeleteMapping("/{roomName}/participants/{participantIdentity}")
    public ResponseEntity<Map<String, Object>> removeParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity) {
        try {
            roomClient.removeParticipant(roomName, participantIdentity)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Participant removed"));
        } catch (Exception e) {
            String errorMessage = "Error removing participant";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Mute published track of a participant in a room
     * 
     * @param params JSON object with trackId
     * @return JSON object with updated track
     */
    @PostMapping("/{roomName}/participants/{participantIdentity}/mute")
    public ResponseEntity<Map<String, Object>> muteParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity, @RequestBody Map<String, String> params) {
        String trackId = params.get("trackId");

        if (trackId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'trackId' is required"));
        }

        try {
            TrackInfo track = roomClient.mutePublishedTrack(roomName, participantIdentity, trackId, true)
                    .execute()
                    .body();
            return ResponseEntity.ok(Map.of("track", convertToJson(track)));
        } catch (Exception e) {
            String errorMessage = "Error muting track";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Subscribe participant to tracks in a room
     * 
     * @param params JSON object with list of trackIds
     * @return JSON object with success message
     */
    @PostMapping("/{roomName}/participants/{participantIdentity}/subscribe")
    public ResponseEntity<Map<String, Object>> subscribeParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity, @RequestBody Map<String, Object> params) {
        Object trackIdsObj = params.get("trackIds");

        if (!isStringList(trackIdsObj)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'trackIds' is required and must be an array"));
        }

        List<String> trackIds = convertToStringList(trackIdsObj);

        try {
            roomClient.updateSubscriptions(roomName, participantIdentity, trackIds, true)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Participant subscribed to tracks"));
        } catch (Exception e) {
            String errorMessage = "Error subscribing participant to tracks";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    /**
     * Unsubscribe participant from tracks in a room
     * 
     * @param params JSON object with list of trackIds
     * @return JSON object with success message
     */
    @PostMapping("/{roomName}/participants/{participantIdentity}/unsubscribe")
    public ResponseEntity<Map<String, Object>> unsubscribeParticipant(@PathVariable String roomName,
            @PathVariable String participantIdentity, @RequestBody Map<String, Object> params) {
        Object trackIdsObj = params.get("trackIds");

        if (!isStringList(trackIdsObj)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("errorMessage", "'trackIds' is required and must be an array"));
        }

        List<String> trackIds = convertToStringList(trackIdsObj);

        try {
            roomClient.updateSubscriptions(roomName, participantIdentity, trackIds, false)
                    .execute();
            return ResponseEntity.ok(Map.of("message", "Participant unsubscribed from tracks"));
        } catch (Exception e) {
            String errorMessage = "Error unsubscribing participant from tracks";
            LOGGER.error(errorMessage, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("errorMessage", errorMessage));
        }
    }

    private <T extends MessageOrBuilder> Map<String, Object> convertToJson(T object)
            throws InvalidProtocolBufferException, JsonProcessingException, JsonMappingException {
        ObjectMapper objectMapper = new ObjectMapper();
        String rawJson = JsonFormat.printer().print(object);
        Map<String, Object> json = objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>() {
        });
        return json;
    }

    private <T extends MessageOrBuilder> List<Map<String, Object>> convertListToJson(List<T> objects) {
        List<Map<String, Object>> jsonList = objects.stream().map(object -> {
            try {
                return convertToJson(object);
            } catch (Exception e) {
                LOGGER.error("Error parsing egress", e);
                return null;
            }
        }).toList();
        return jsonList;
    }

    private boolean isStringList(Object obj) {
        return obj instanceof List<?> list && !list.isEmpty() && list.stream().allMatch(String.class::isInstance);
    }

    private List<String> convertToStringList(Object obj) {
        return ((List<?>) obj).stream()
                .map(String.class::cast)
                .toList();
    }
}
