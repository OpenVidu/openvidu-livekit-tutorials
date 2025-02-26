package controllers

import (
	"net/http"
	"openvidu/go/config"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
)

func TokenRoutes(router *gin.Engine) {
	router.POST("/token", createToken)
}

func createToken(c *gin.Context) {
	var body struct {
		RoomName        string `json:"roomName" binding:"required"`
		ParticipantName string `json:"participantName" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"errorMessage": "'roomName' and 'participantName' are required"})
		return
	}

	at := auth.NewAccessToken(config.LivekitApiKey, config.LivekitApiSecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     body.RoomName,
	}
	at.SetVideoGrant(grant).SetIdentity(body.ParticipantName)

	token, err := at.ToJWT()
	if err != nil {
		c.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}
