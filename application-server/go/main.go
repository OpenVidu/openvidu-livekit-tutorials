package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/webhook"
)

var (
	SERVER_PORT        = getEnv("SERVER_PORT", "6080")
	LIVEKIT_API_KEY    = getEnv("LIVEKIT_API_KEY", "devkey")
	LIVEKIT_API_SECRET = getEnv("LIVEKIT_API_SECRET", "secret")
)

func getEnv(key, defaultValue string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return defaultValue
}

func createToken(context *gin.Context) {
	var body struct {
		RoomName        string `json:"roomName"`
		ParticipantName string `json:"participantName"`
	}

	if err := context.BindJSON(&body); err != nil {
		context.JSON(http.StatusBadRequest, err.Error())
		return
	}

	if body.RoomName == "" || body.ParticipantName == "" {
		context.JSON(http.StatusBadRequest, gin.H{"errorMessage": "roomName and participantName are required"})
		return
	}

	at := auth.NewAccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     body.RoomName,
	}
	at.AddGrant(grant).SetIdentity(body.ParticipantName)

	token, err := at.ToJWT()
	if err != nil {
		context.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	context.JSON(http.StatusOK, gin.H{"token": token})
}

func receiveWebhook(context *gin.Context) {
	authProvider := auth.NewSimpleKeyProvider(
		LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
	)
	event, err := webhook.ReceiveWebhookEvent(context.Request, authProvider)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error validating webhook event: %v", err)
		return
	}
	fmt.Println("LiveKit Webhook", event)
}

func main() {
	router := gin.Default()
	router.Use(cors.Default())
	router.POST("/token", createToken)
	router.POST("/livekit/webhook", receiveWebhook)
	router.Run(":" + SERVER_PORT)
}
