# Application Server Tutorials

These tutorials implement an application server that defines a full REST API for interacting with LiveKit in different languages using its corresponding SDKs. This is useful to see an example of how to call all differents endpoints of LiveKit Twirp API.

> [!NOTE]
> By the moment, tutorials are only fully implemented in Node.js, Java and Go. Besides, AgentDispatchClient and SipClient methods are not implemented in any tutorial.

## Testing API endpoints

To test API endpoints, we have defined a [Postman collection](./application-server-tutorials.postman_collection.json) that you can import into your Postman client.

This collection defines a set of variables that requests use in order to reduce the amount of changes you need to make to test the API. This variables are:

- `BASE_URL`: The base URL of the application server. By default, it is set to `http://localhost:6080`.
- `ROOM_URL`: The base URL of all room-related endpoints. By default, it is set to `{{BASE_URL}}/rooms`.
- `EGRESS_URL`: The base URL of all egress-related endpoints. By default, it is set to `{{BASE_URL}}/egress`.
- `INGRESS_URL`: The base URL of all ingress-related endpoints. By default, it is set to `{{BASE_URL}}/ingress`.
- `ROOM_NAME`: The name of the room. By default, it is set to `Test Room`.
- `PARTICIPANT_IDENTITY`: The identity of the participant. By default, it is set to `Participant1`.
- `TRACK_ID`: The ID of the track.
- `EGRESS_ID`: The ID of the egress.
- `INGRESS_ID`: The ID of the ingress.

The collection is divided into folders, each one containing requests for a specific endpoint:

- `Room`: Contains requests for room-related endpoints.
- `Egress`: Contains requests for egress-related endpoints.
- `Ingress`: Contains requests for ingress-related endpoints.

In addition, there is another request apart from the folders:

- **Create token**: Generates a token for a participant to join a room.
  - **Method**: `POST`
  - **URL**: `{{BASE_URL}}/token`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "participantIdentity": "{{PARTICIPANT_IDENTITY}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "token": "..."
    }
    ```

### Room requests

The `Room` folder contains the following requests:

- **Create room**: Creates a new room.

  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "room": {...}
    }
    ```

- **List rooms**: Retrieves a list of active rooms, optionally filtered by name.

  - **Method**: `GET`
  - **URL**: `{{ROOM_URL}}?roomName={{ROOM_NAME}}`
  - **Example Response**:
    ```json
    {
      "rooms": [...]
    }
    ```

- **Update room metadata**: Updates the metadata of a room.

  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/metadata`
  - **Body**:
    ```json
    {
      "metadata": "Some data"
    }
    ```
  - **Example Response**:
    ```json
    {
      "room": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, a room must be created and the `ROOM_NAME` variable must be set to the name of the room.

- **Send data**: Sends a data message to all participants in a room.

  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/send-data`
  - **Body**:
    ```json
    {
      "data": {
        "some": "data"
      }
    }
    ```
  - **Example Response**:
    ```json
    {
      "message": "Data message sent"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, a room must be created and the `ROOM_NAME` variable must be set to the name of the room.

- **Delete room**: Deletes a room.

  - **Method**: `DELETE`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}`
  - **Example Response**:
    ```json
    {
      "message": "Room deleted"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, a room must be created and the `ROOM_NAME` variable must be set to the name of the room.

- **List participants**: Retrieves the list of participants in a room.

  - **Method**: `GET`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants`
  - **Example Response**:
    ```json
    {
      "participants": [...]
    }
    ```

- **Get participant**: Retrieves information about a specific participant.

  - **Method**: `GET`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}`
  - **Example Response**:
    ```json
    {
      "participant": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly.

- **Update participant**: Updates metadata of a participant.

  - **Method**: `PATCH`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}`
  - **Body**:
    ```json
    {
      "metadata": "Some data"
    }
    ```
  - **Example Response**:
    ```json
    {
      "participant": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly.

- **Delete participant**: Removes a participant from a room.

  - **Method**: `DELETE`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}`
  - **Example Response**:
    ```json
    {
      "message": "Participant removed"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly.

- **Mute track**: Mutes a specific track for a participant.

  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}/mute`
  - **Body**:
    ```json
    {
      "trackId": "{{TRACK_ID}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "track": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly. Then, set the `TRACK_ID` variable to the ID of one of the participant's tracks obtained from the response of the `Get participant` request.

- **Subscribe to tracks**: Subscribes a participant to specific tracks.

  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}/subscribe`
  - **Body**:
    ```json
    {
      "trackIds": ["{{TRACK_ID}}"]
    }
    ```
  - **Example Response**:
    ```json
    {
      "message": "Participant subscribed to tracks"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join two participants in a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly. Then, set the `TRACK_ID` variable to the ID of one of the other participant's tracks obtained from the response of the `Get participant` request.

- **Unsubscribe from tracks**: Unsubscribes a participant from specific tracks.
  - **Method**: `POST`
  - **URL**: `{{ROOM_URL}}/{{ROOM_NAME}}/participants/{{PARTICIPANT_IDENTITY}}/unsubscribe`
  - **Body**:
    ```json
    {
      "trackIds": ["{{TRACK_ID}}"]
    }
    ```
  - **Example Response**:
    ```json
    {
      "message": "Participant unsubscribed from tracks"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join two participants in a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly. Then, set the `TRACK_ID` variable to the ID of one of the other participant's tracks obtained from the response of the `Get participant` request.

### Egress requests

The `Egress` folder contains the following requests:

- **Create RoomComposite egress**: Starts recording a room with a composite layout.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/room-composite`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` correctly.

- **Create stream egress**: Starts streaming a room to an external RTMP server.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/stream`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "streamUrl": "rtmp://live.twitch.tv/app/stream-key"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` correctly.

- **Create Participant egress**: Starts recording a specific participant's tracks.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/participant`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "participantIdentity": "{{PARTICIPANT_IDENTITY}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly.

- **Create TrackComposite egress**: Starts recording specific audio and video tracks.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/track-composite`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "videoTrackId": "{{TRACK_ID}}",
      "audioTrackId": "TR_EXAMPLE"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly.. Then, set the `TRACK_ID` variable to the ID of the video track obtained from the response of the `Get participant` request and the `audioTrackId` parameter to the ID of the audio track.

- **Create Track egress**: Starts recording a specific track.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/track`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "trackId": "{{TRACK_ID}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, you need to join a room using one of the [application clients](../application-client) and set the `ROOM_NAME` and `PARTICIPANT_IDENTITY` correctly. Then, set the `TRACK_ID` variable to the ID of one of the tracks obtained from the response of the `Get participant` request.

- **Create Web egress**: Starts recording a webpage.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/web`
  - **Body**:
    ```json
    {
      "url": "https://openvidu.io"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

- **List egresses**: Retrieves the list of egresses, optionally filtered by room name, egressID or active status.

  - **Method**: `GET`
  - **URL**: `{{EGRESS_URL}}?roomName={{ROOM_NAME}}&active=true`
  - **Example Response**:
    ```json
    {
      "egresses": [...]
    }
    ```

- **Update egress layout**: Changes the layout of an active RoomComposite egress.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/{{EGRESS_ID}}/layout`
  - **Body**:
    ```json
    {
      "layout": "speaker"
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, a RoomComposite egress must be created and the `EGRESS_ID` variable must be set correctly.

- **Add/remove stream URLs**: Adds or removes RTMP stream URLs in an active egress.

  - **Method**: `POST`
  - **URL**: `{{EGRESS_URL}}/{{EGRESS_ID}}/streams`
  - **Body**:
    ```json
    {
      "streamUrlsToAdd": ["rtmp://a.rtmp.youtube.com/live2/stream-key"],
      "streamUrlsToRemove": []
    }
    ```
  - **Example Response**:
    ```json
    {
      "egress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, a stream egress must be created and the `EGRESS_ID` variable must be set correctly.

- **Stop egress**: Terminates an active egress process.

  - **Method**: `DELETE`
  - **URL**: `{{EGRESS_URL}}/{{EGRESS_ID}}`
  - **Example Response**:
    ```json
    {
      "message": "Egress stopped"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, an egress must be created and the `EGRESS_ID` variable must be set correctly.

### Ingress requests

The `Ingress` folder contains the following requests:

- **Create RTMP ingress**: Creates an RTMP ingress.

  - **Method**: `POST`
  - **URL**: `{{INGRESS_URL}}/rtmp`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "participantIdentity": "Ingress-Participant"
    }
    ```
  - **Example Response**:
    ```json
    {
      "ingress": {...}
    }
    ```

- **Create WHIP ingress**: Creates a WHIP ingress.

  - **Method**: `POST`
  - **URL**: `{{INGRESS_URL}}/whip`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "participantIdentity": "Ingress-Participant"
    }
    ```
  - **Example Response**:
    ```json
    {
      "ingress": {...}
    }
    ```

- **Create URL ingress**: Creates a URL ingress.

  - **Method**: `POST`
  - **URL**: `{{INGRESS_URL}}/url`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}",
      "participantIdentity": "Ingress-Participant",
      "url": "http://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8"
    }
    ```
  - **Example Response**:
    ```json
    {
      "ingress": {...}
    }
    ```

- **List ingresses**: Retrieves the list of ingresses, optionally filtered by room name or ingress ID.

  - **Method**: `GET`
  - **URL**: `{{INGRESS_URL}}?roomName={{ROOM_NAME}}`
  - **Example Response**:
    ```json
    {
      "ingresses": [...]
    }
    ```

- **Update ingress**: Updates an existing ingress.

  - **Method**: `PATCH`
  - **URL**: `{{INGRESS_URL}}/{{INGRESS_ID}}`
  - **Body**:
    ```json
    {
      "roomName": "{{ROOM_NAME}}"
    }
    ```
  - **Example Response**:
    ```json
    {
      "ingress": {...}
    }
    ```

> [!IMPORTANT]
> Before sending previous request, an ingress must be created and the `INGRESS_ID` variable must be set correctly.

- **Delete ingress**: Deletes an existing ingress.

  - **Method**: `DELETE`
  - **URL**: `{{INGRESS_URL}}/{{INGRESS_ID}}`
  - **Example Response**:
    ```json
    {
      "message": "Ingress deleted"
    }
    ```

> [!IMPORTANT]
> Before sending previous request, an ingress must be created and the `INGRESS_ID` variable must be set correctly.
