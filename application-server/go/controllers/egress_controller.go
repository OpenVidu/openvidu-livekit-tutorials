package controllers

import (
	"log"
	"net/http"
	"openvidu/go/config"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

var (
	egressClient *lksdk.EgressClient
)

func EgressRoutes(router *gin.Engine) {
	// Initialize egress client
	egressClient = lksdk.NewEgressClient(config.LivekitUrl, config.LivekitApiKey, config.LivekitApiSecret)

	egressGroup := router.Group("/egresses")
	{
		egressGroup.POST("/room-composite", createRoomCompositeEgress)
		egressGroup.POST("/stream", createStreamEgress)
		egressGroup.POST("/participant", createParticipantEgress)
		egressGroup.POST("/track-composite", createTrackCompositeEgress)
		egressGroup.POST("/track", createTrackEgress)
		egressGroup.POST("/web", createWebEgress)
		egressGroup.GET("/", listEgresses)
		egressGroup.POST("/:egressId/layout", updateEgressLayout)
		egressGroup.POST("/:egressId/streams", updateEgressStreams)
		egressGroup.DELETE("/:egressId", stopEgress)
	}
}

// Create a new RoomComposite egress
func createRoomCompositeEgress(c *gin.Context) {
	var body struct {
		RoomName string `json:"roomName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' is required"})
		return
	}

	req := &livekit.RoomCompositeEgressRequest{
		RoomName: body.RoomName,
		Layout:   "grid",
		FileOutputs: []*livekit.EncodedFileOutput{
			{
				FileType: livekit.EncodedFileType_MP4,
				Filepath: "{room_name}-{room_id}-{time}",
			},
		},
	}
	egress, err := egressClient.StartRoomCompositeEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating RoomComposite egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// Create a new RoomComposite egress to stream to a URL
func createStreamEgress(c *gin.Context) {
	var body struct {
		RoomName  string `json:"roomName" binding:"required"`
		StreamUrl string `json:"streamUrl" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'streamUrl' are required"})
		return
	}

	req := &livekit.RoomCompositeEgressRequest{
		RoomName: body.RoomName,
		Layout:   "grid",
		StreamOutputs: []*livekit.StreamOutput{
			{
				Protocol: livekit.StreamProtocol_RTMP,
				Urls:     []string{body.StreamUrl},
			},
		},
	}
	egress, err := egressClient.StartRoomCompositeEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating RoomComposite egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// Create a new Participant egress
func createParticipantEgress(c *gin.Context) {
	var body struct {
		RoomName            string `json:"roomName" binding:"required"`
		ParticipantIdentity string `json:"participantIdentity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'participantIdentity' are required"})
		return
	}

	req := &livekit.ParticipantEgressRequest{
		RoomName: body.RoomName,
		Identity: body.ParticipantIdentity,
		FileOutputs: []*livekit.EncodedFileOutput{
			{
				FileType: livekit.EncodedFileType_MP4,
				Filepath: "{room_name}-{room_id}-{publisher_identity}-{time}",
			},
		},
	}
	egress, err := egressClient.StartParticipantEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating Participant egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// Create a new TrackComposite egress
func createTrackCompositeEgress(c *gin.Context) {
	var body struct {
		RoomName     string `json:"roomName" binding:"required"`
		VideoTrackId string `json:"videoTrackId" binding:"required"`
		AudioTrackId string `json:"audioTrackId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName', 'videoTrackId' and 'audioTrackId' are required"})
		return
	}

	req := &livekit.TrackCompositeEgressRequest{
		RoomName:     body.RoomName,
		VideoTrackId: body.VideoTrackId,
		AudioTrackId: body.AudioTrackId,
		FileOutputs: []*livekit.EncodedFileOutput{
			{
				FileType: livekit.EncodedFileType_MP4,
				Filepath: "{room_name}-{room_id}-{publisher_identity}-{time}",
			},
		},
	}
	egress, err := egressClient.StartTrackCompositeEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating TrackComposite egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// Create a new Track egress
func createTrackEgress(c *gin.Context) {
	var body struct {
		RoomName string `json:"roomName" binding:"required"`
		TrackId  string `json:"trackId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'trackId' are required"})
		return
	}

	req := &livekit.TrackEgressRequest{
		RoomName: body.RoomName,
		TrackId:  body.TrackId,
		Output: &livekit.TrackEgressRequest_File{
			File: &livekit.DirectFileOutput{
				Filepath: "{room_name}-{room_id}-{publisher_identity}-{track_source}-{track_id}-{time}",
			},
		},
	}
	egress, err := egressClient.StartTrackEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating Track egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// Create a new Web egress
func createWebEgress(c *gin.Context) {
	var body struct {
		Url string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' is required"})
		return
	}

	req := &livekit.WebEgressRequest{
		Url: body.Url,
		FileOutputs: []*livekit.EncodedFileOutput{
			{
				FileType: livekit.EncodedFileType_MP4,
				Filepath: "{time}",
			},
		},
	}
	egress, err := egressClient.StartWebEgress(ctx, req)
	if err != nil {
		errorMessage := "Error creating Web egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"egress": egress})
}

// List egresses
// If an egress ID is provided, only that egress is listed
// If a room name is provided, only egresses for that room are listed
// If active is true, only active egresses are listed
func listEgresses(c *gin.Context) {
	egressId := c.Query("egressId")
	roomName := c.Query("roomName")
	active := c.Query("active") == "true"

	req := &livekit.ListEgressRequest{
		EgressId: egressId,
		RoomName: roomName,
		Active:   active,
	}
	res, err := egressClient.ListEgress(ctx, req)
	if err != nil {
		errorMessage := "Error listing egresses"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	egresses := res.Items
	if egresses == nil {
		egresses = []*livekit.EgressInfo{}
	}
	c.JSON(http.StatusOK, gin.H{"egresses": egresses})
}

// Update egress layout
func updateEgressLayout(c *gin.Context) {
	egressId := c.Param("egressId")

	var body struct {
		Layout string `json:"layout" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'layout' is required"})
		return
	}

	req := &livekit.UpdateLayoutRequest{
		EgressId: egressId,
		Layout:   body.Layout,
	}
	egress, err := egressClient.UpdateLayout(ctx, req)
	if err != nil {
		errorMessage := "Error updating egress layout"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"egress": egress})
}

// Add/remove stream URLs to an egress
func updateEgressStreams(c *gin.Context) {
	egressId := c.Param("egressId")

	var body struct {
		StreamUrlsToAdd    []string `json:"streamUrlsToAdd"`
		StreamUrlsToRemove []string `json:"streamUrlsToRemove"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'streamUrlsToAdd' and 'streamUrlsToRemove' are required and must be arrays"})
		return
	}

	req := &livekit.UpdateStreamRequest{
		EgressId:         egressId,
		AddOutputUrls:    body.StreamUrlsToAdd,
		RemoveOutputUrls: body.StreamUrlsToRemove,
	}
	egress, err := egressClient.UpdateStream(ctx, req)
	if err != nil {
		errorMessage := "Error updating egress streams"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"egress": egress})
}

// Stop an egress
func stopEgress(c *gin.Context) {
	egressId := c.Param("egressId")

	req := &livekit.StopEgressRequest{
		EgressId: egressId,
	}
	_, err := egressClient.StopEgress(ctx, req)
	if err != nil {
		errorMessage := "Error stopping egress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Egress stopped"})
}
