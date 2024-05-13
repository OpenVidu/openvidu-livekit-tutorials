use axum::{
    extract::Json, http::header::CONTENT_TYPE, http::Method, http::StatusCode, routing::post,
    Router,
};
use dotenv::dotenv;
use env_logger::Env;
use livekit_api::access_token;
use log::info;
use serde_json::Value;
use std::env;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init(); // Init logger
    dotenv().ok(); // Load environment variables from .env

    // Check that required environment variables are set
    let server_port = env::var("SERVER_PORT").unwrap_or("6080".to_string());
    env::var("LIVEKIT_API_KEY").expect("LIVEKIT_API_KEY is not set");
    env::var("LIVEKIT_API_SECRET").expect("LIVEKIT_API_SECRET is not set");

    let cors = CorsLayer::new()
        .allow_methods([Method::POST])
        .allow_origin(Any)
        .allow_headers([CONTENT_TYPE]);

    let app = Router::new().route("/token", post(get_token)).layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:".to_string() + &server_port)
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_token(payload: Option<Json<Value>>) -> (StatusCode, Json<String>) {
    if let Some(payload) = payload {
        let livekit_api_key = env::var("LIVEKIT_API_KEY").expect("LIVEKIT_API_KEY is not set");
        let livekit_api_secret =
            env::var("LIVEKIT_API_SECRET").expect("LIVEKIT_API_SECRET is not set");

        let room_name = payload.get("roomName").expect("roomName is required");
        let participant_name = payload
            .get("participantName")
            .expect("participantName is required");

        let token = access_token::AccessToken::with_api_key(&livekit_api_key, &livekit_api_secret)
            .with_identity(&participant_name.to_string())
            .with_name(&participant_name.to_string())
            .with_grants(access_token::VideoGrants {
                room_join: true,
                room: room_name.to_string(),
                ..Default::default()
            })
            .to_jwt()
            .unwrap();

        info!(
            "Sending token for room {} to participant {}",
            room_name, participant_name
        );

        return (StatusCode::OK, Json(token));
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json("roomName and participantName are required".to_string()),
        );
    }
}
