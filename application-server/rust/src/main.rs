use axum::http::HeaderMap;
use axum::{
    extract::Json, http::header::CONTENT_TYPE, http::Method, http::StatusCode, routing::post,
    Router,
};
use dotenv::dotenv;
use livekit_api::access_token::AccessToken;
use livekit_api::access_token::TokenVerifier;
use livekit_api::access_token::VideoGrants;
use livekit_api::webhooks::WebhookReceiver;
use serde_json::{json, Value};
use std::env;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenv().ok(); // Load environment variables from .env

    let server_port = env::var("SERVER_PORT").unwrap_or("6081".to_string());

    let cors = CorsLayer::new()
        .allow_methods([Method::POST])
        .allow_origin(Any)
        .allow_headers([CONTENT_TYPE]);

    let app = Router::new()
        .route("/token", post(create_token))
        .route("/livekit/webhook", post(receive_webhook))
        .layer(cors);

    let listener = TcpListener::bind("0.0.0.0:".to_string() + &server_port)
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn create_token(payload: Option<Json<Value>>) -> (StatusCode, Json<Value>) {
    if let Some(payload) = payload {
        let livekit_api_key = env::var("LIVEKIT_API_KEY").unwrap_or("devkey".to_string());
        let livekit_api_secret = env::var("LIVEKIT_API_SECRET").unwrap_or("secret".to_string());

        let room_name = match payload.get("roomName") {
            Some(value) => value,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "errorMessage": "roomName is required" })),
                );
            }
        };
        let participant_name = match payload.get("participantName") {
            Some(value) => value,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "errorMessage": "participantName is required" })),
                );
            }
        };

        let token = match AccessToken::with_api_key(&livekit_api_key, &livekit_api_secret)
            .with_identity(&participant_name.to_string())
            .with_name(&participant_name.to_string())
            .with_grants(VideoGrants {
                room_join: true,
                room: room_name.to_string(),
                ..Default::default()
            })
            .to_jwt()
        {
            Ok(token) => token,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "errorMessage": "Error creating token" })),
                );
            }
        };

        return (StatusCode::OK, Json(json!({ "token": token })));
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "errorMessage": "roomName and participantName are required" })),
        );
    }
}

async fn receive_webhook(headers: HeaderMap, body: String) -> (StatusCode, String) {
    let livekit_api_key = env::var("LIVEKIT_API_KEY").unwrap_or("devkey".to_string());
    let livekit_api_secret = env::var("LIVEKIT_API_SECRET").unwrap_or("secret".to_string());
    let token_verifier = TokenVerifier::with_api_key(&livekit_api_key, &livekit_api_secret);
    let webhook_receiver = WebhookReceiver::new(token_verifier);

    let auth_header = match headers.get("Authorization") {
        Some(header_value) => match header_value.to_str() {
            Ok(header_str) => header_str,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    "Invalid Authorization header format".to_string(),
                );
            }
        },
        None => {
            return (
                StatusCode::BAD_REQUEST,
                "Authorization header is required".to_string(),
            );
        }
    };

    match webhook_receiver.receive(&body, auth_header) {
        Ok(event) => {
            println!("LiveKit WebHook: {:?}", event);
            return (StatusCode::OK, "ok".to_string());
        }
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                "Error validating webhook event".to_string(),
            );
        }
    }
}
