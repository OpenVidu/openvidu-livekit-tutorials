package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

var (
	ServerPort       string
	LivekitUrl       string
	LivekitApiKey    string
	LivekitApiSecret string
)

func LoadEnv() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Error loading .env file")
	}

	ServerPort = getEnv("SERVER_PORT", "6080")
	LivekitUrl = getEnv("LIVEKIT_URL", "http://localhost:7880")
	LivekitApiKey = getEnv("LIVEKIT_API", "devkey")
	LivekitApiSecret = getEnv("LIVEKIT_API_SECRET", "secret")
}

func getEnv(key, defaultValue string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return defaultValue
}
