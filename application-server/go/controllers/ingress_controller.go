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
	ingressClient *lksdk.IngressClient
)

func IngressRoutes(router *gin.Engine) {
	// Initialize ingress client
	ingressClient = lksdk.NewIngressClient(config.LivekitUrl, config.LivekitApiKey, config.LivekitApiSecret)

	ingressGroup := router.Group("/ingresses")
	{
		ingressGroup.POST("/rtmp", createRTMPIngress)
		ingressGroup.POST("/whip", createWHIPIngress)
		ingressGroup.POST("/url", createURLIngress)
		ingressGroup.GET("/", listIngresses)
		ingressGroup.PATCH("/:ingressId", updateIngress)
		ingressGroup.DELETE("/:ingressId", deleteIngress)
	}
}

// Create a new RTMP ingress
func createRTMPIngress(c *gin.Context) {
	var body struct {
		RoomName            string `json:"roomName" binding:"required"`
		ParticipantIdentity string `json:"participantIdentity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'participantIdentity' are required"})
		return
	}

	req := &livekit.CreateIngressRequest{
		InputType:           livekit.IngressInput_RTMP_INPUT,
		Name:                "rtmp-ingress",
		RoomName:            body.RoomName,
		ParticipantIdentity: body.ParticipantIdentity,
	}
	ingress, err := ingressClient.CreateIngress(ctx, req)
	if err != nil {
		errorMessage := "Error creating RTMP ingress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ingress": ingress})
}

// Create a new WHIP ingress
func createWHIPIngress(c *gin.Context) {
	var body struct {
		RoomName            string `json:"roomName" binding:"required"`
		ParticipantIdentity string `json:"participantIdentity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'participantIdentity' are required"})
		return
	}

	req := &livekit.CreateIngressRequest{
		InputType:           livekit.IngressInput_WHIP_INPUT,
		Name:                "whip-ingress",
		RoomName:            body.RoomName,
		ParticipantIdentity: body.ParticipantIdentity,
	}
	ingress, err := ingressClient.CreateIngress(ctx, req)
	if err != nil {
		errorMessage := "Error creating WHIP ingress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ingress": ingress})
}

// Create a new URL ingress
func createURLIngress(c *gin.Context) {
	var body struct {
		RoomName            string `json:"roomName" binding:"required"`
		ParticipantIdentity string `json:"participantIdentity" binding:"required"`
		Url                 string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName', 'participantIdentity' and 'url' are required"})
		return
	}

	req := &livekit.CreateIngressRequest{
		InputType:           livekit.IngressInput_URL_INPUT,
		Name:                "url-ingress",
		RoomName:            body.RoomName,
		ParticipantIdentity: body.ParticipantIdentity,
		Url:                 body.Url,
	}
	ingress, err := ingressClient.CreateIngress(ctx, req)
	if err != nil {
		errorMessage := "Error creating URL ingress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ingress": ingress})
}

// List ingresses
// If an ingress ID is provided, only that ingress is listed
// If a room name is provided, only ingresses for that room are listed
func listIngresses(c *gin.Context) {
	ingressId := c.Query("ingressId")
	roomName := c.Query("roomName")

	req := &livekit.ListIngressRequest{
		IngressId: ingressId,
		RoomName:  roomName,
	}
	res, err := ingressClient.ListIngress(ctx, req)
	if err != nil {
		errorMessage := "Error listing ingresses"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	ingresses := res.Items
	if ingresses == nil {
		ingresses = []*livekit.IngressInfo{}
	}
	c.JSON(http.StatusOK, gin.H{"ingresses": ingresses})
}

// Update ingress
func updateIngress(c *gin.Context) {
	ingressId := c.Param("ingressId")

	var body struct {
		RoomName string `json:"roomName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' is required"})
		return
	}

	req := &livekit.UpdateIngressRequest{
		IngressId: ingressId,
		Name:      "updated-ingress",
		RoomName:  body.RoomName,
	}
	ingress, err := ingressClient.UpdateIngress(ctx, req)
	if err != nil {
		errorMessage := "Error updating ingress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ingress": ingress})
}

// Delete ingress
func deleteIngress(c *gin.Context) {
	ingressId := c.Param("ingressId")

	req := &livekit.DeleteIngressRequest{
		IngressId: ingressId,
	}
	_, err := ingressClient.DeleteIngress(ctx, req)
	if err != nil {
		errorMessage := "Error deleting ingress"
		log.Println(errorMessage+":", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"errorMessage": errorMessage})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ingress deleted"})
}
