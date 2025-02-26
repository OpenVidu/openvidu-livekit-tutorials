package main

import (
	"openvidu/go/config"
	"openvidu/go/controllers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	router := gin.Default()
	router.Use(cors.Default())

	controllers.TokenRoutes(router)
	controllers.WebhookRoutes(router)
	controllers.RoomRoutes(router)
	controllers.EgressRoutes(router)
	controllers.IngressRoutes(router)

	router.Run(":" + config.ServerPort)
}
