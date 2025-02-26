package controllers

import (
	"encoding/json"
	"fmt"
	"openvidu/go/config"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/webhook"
)

var authProvider *auth.SimpleKeyProvider

func WebhookRoutes(router *gin.Engine) {
	// Initialize authProvider
	authProvider = auth.NewSimpleKeyProvider(
		config.LivekitApiKey, config.LivekitApiSecret,
	)

	router.POST("/livekit/webhook", receiveWebhook)
}

func receiveWebhook(c *gin.Context) {
	webhookEvent, err := webhook.ReceiveWebhookEvent(c.Request, authProvider)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error validating webhook event: %v", err)
		return
	}

	json, _ := json.MarshalIndent(webhookEvent, "", "  ")
	fmt.Println("LiveKit Webhook:\n", string(json))
}
