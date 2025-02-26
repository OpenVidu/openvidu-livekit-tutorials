package controllers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"openvidu/go/config"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

var (
	roomClient *lksdk.RoomServiceClient
	ctx        = context.Background()
)

func RoomRoutes(router *gin.Engine) {
	// Initialize RoomServiceClient
	roomClient = lksdk.NewRoomServiceClient(config.LivekitUrl, config.LivekitApiKey, config.LivekitApiSecret)

	roomGroup := router.Group("/rooms")
	{
		roomGroup.POST("", createRoom)
		roomGroup.GET("", listRooms)
		roomGroup.POST("/:roomName/metadata", updateRoomMetadata)
		roomGroup.POST("/:roomName/send-data", sendData)
		roomGroup.DELETE("/:roomName", deleteRoom)
		roomGroup.GET("/:roomName/participants", listParticipants)
		roomGroup.GET("/:roomName/participants/:participantIdentity", getParticipant)
		roomGroup.PATCH("/:roomName/participants/:participantIdentity", updateParticipant)
		roomGroup.DELETE("/:roomName/participants/:participantIdentity", removeParticipant)
		roomGroup.POST("/:roomName/participants/:participantIdentity/mute", muteParticipant)
		roomGroup.POST("/:roomName/participants/:participantIdentity/subscribe", subscribeParticipant)
		roomGroup.POST("/:roomName/participants/:participantIdentity/unsubscribe", unsubscribeParticipant)
	}
}

// Create a new room
func createRoom(c *gin.Context) {
	var body struct {
		RoomName string `json:"roomName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' is required"})
		return
	}

	req := &livekit.CreateRoomRequest{
		Name: body.RoomName,
	}
	room, err := roomClient.CreateRoom(ctx, req)
	if err != nil {
		errorMessage := "Error creating room"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"room": room})
}

// List rooms. If a room name is provided, only that room is listed
func listRooms(c *gin.Context) {
	roomName := c.Query("roomName")

	var roomNames []string
	if roomName != "" {
		roomNames = []string{roomName}
	}

	req := &livekit.ListRoomsRequest{
		Names: roomNames,
	}
	res, err := roomClient.ListRooms(ctx, req)
	if err != nil {
		errorMessage := "Error listing rooms"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	rooms := res.Rooms
	if rooms == nil {
		rooms = []*livekit.Room{}
	}
	c.JSON(http.StatusOK, gin.H{"rooms": rooms})
}

// Update room metadata
func updateRoomMetadata(c *gin.Context) {
	roomName := c.Param("roomName")

	var body struct {
		Metadata string `json:"metadata" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'metadata' is required"})
		return
	}

	req := &livekit.UpdateRoomMetadataRequest{
		Room:     roomName,
		Metadata: body.Metadata,
	}
	room, err := roomClient.UpdateRoomMetadata(ctx, req)
	if err != nil {
		errorMessage := "Error updating room metadata"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"room": room})
}

// Send data message to participants in a room
func sendData(c *gin.Context) {
	roomName := c.Param("roomName")

	var body struct {
		Data json.RawMessage `json:"data" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'data' is required"})
		return
	}

	rawData, err := json.Marshal(body.Data)
	if err != nil {
		log.Println("Error encoding data message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": "Error encoding data message"})
		return
	}

	topic := "chat"
	req := &livekit.SendDataRequest{
		Room:                  roomName,
		Data:                  rawData,
		Kind:                  livekit.DataPacket_RELIABLE,
		Topic:                 &topic,
		DestinationIdentities: []string{},
	}
	_, err = roomClient.SendData(ctx, req)
	if err != nil {
		errorMessage := "Error sending data message"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data message sent"})
}

// Delete a room
func deleteRoom(c *gin.Context) {
	roomName := c.Param("roomName")

	req := &livekit.DeleteRoomRequest{
		Room: roomName,
	}
	_, err := roomClient.DeleteRoom(ctx, req)
	if err != nil {
		errorMessage := "Error deleting room"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room deleted"})
}

// List participants in a room
func listParticipants(c *gin.Context) {
	roomName := c.Param("roomName")

	req := &livekit.ListParticipantsRequest{
		Room: roomName,
	}
	res, err := roomClient.ListParticipants(ctx, req)
	if err != nil {
		errorMessage := "Error listing participants"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	participants := res.Participants
	if participants == nil {
		participants = []*livekit.ParticipantInfo{}
	}
	c.JSON(http.StatusOK, gin.H{"participants": participants})
}

// Get a participant in a room
func getParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	req := &livekit.RoomParticipantIdentity{
		Room:     roomName,
		Identity: participantIdentity,
	}
	participant, err := roomClient.GetParticipant(ctx, req)
	if err != nil {
		errorMessage := "Error getting participant"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"participant": participant})
}

// Update a participant in a room
func updateParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	var body struct {
		Metadata string `json:"metadata" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'metadata' is required"})
		return
	}

	req := &livekit.UpdateParticipantRequest{
		Room:     roomName,
		Identity: participantIdentity,
		Metadata: body.Metadata,
		Permission: &livekit.ParticipantPermission{
			CanPublish:   false,
			CanSubscribe: true,
		},
	}
	participant, err := roomClient.UpdateParticipant(ctx, req)
	if err != nil {
		errorMessage := "Error updating participant"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"participant": participant})
}

// Remove a participant from a room
func removeParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	req := &livekit.RoomParticipantIdentity{
		Room:     roomName,
		Identity: participantIdentity,
	}
	_, err := roomClient.RemoveParticipant(ctx, req)
	if err != nil {
		errorMessage := "Error removing participant"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participant removed"})
}

// Mute published track of a participant in a room
func muteParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	var body struct {
		TrackId string `json:"trackId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'trackSid' is required"})
		return
	}

	req := &livekit.MuteRoomTrackRequest{
		Room:     roomName,
		Identity: participantIdentity,
		TrackSid: body.TrackId,
		Muted:    true,
	}
	res, err := roomClient.MutePublishedTrack(ctx, req)
	if err != nil {
		errorMessage := "Error muting track"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"track": res.Track})
}

// Subscribe participant to tracks in a room
func subscribeParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	var body struct {
		TrackIds []string `json:"trackIds" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil || len(body.TrackIds) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'trackIds' is required and must be an array"})
		return
	}

	req := &livekit.UpdateSubscriptionsRequest{
		Room:      roomName,
		Identity:  participantIdentity,
		TrackSids: body.TrackIds,
		Subscribe: true,
	}
	_, err := roomClient.UpdateSubscriptions(ctx, req)
	if err != nil {
		errorMessage := "Error subscribing participant to tracks"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participant subscribed to tracks"})
}

// Unsubscribe participant from tracks in a room
func unsubscribeParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantIdentity := c.Param("participantIdentity")

	var body struct {
		TrackIds []string `json:"trackIds" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil || len(body.TrackIds) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'trackIds' is required and must be an array"})
		return
	}

	req := &livekit.UpdateSubscriptionsRequest{
		Room:      roomName,
		Identity:  participantIdentity,
		TrackSids: body.TrackIds,
		Subscribe: false,
	}
	_, err := roomClient.UpdateSubscriptions(ctx, req)
	if err != nil {
		errorMessage := "Error unsubscribing participant from tracks"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participant unsubscribed from tracks"})
}
