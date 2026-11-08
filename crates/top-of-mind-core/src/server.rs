//! Loopback development gateway for the same core used by Tauri.
//! Production hosting needs an authenticated HTTPS gateway; do not expose this listener.
use axum::{
    extract::{Query, State},
    http::{HeaderMap, Method, StatusCode, Uri},
    response::IntoResponse,
    routing::any,
    Json, Router,
};
use serde_json::{json, Value};
use std::{collections::HashMap, path::PathBuf};
use top_of_mind_core::Hub;

async fn request(
    State(hub): State<Hub>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    body: Option<Json<Value>>,
) -> impl IntoResponse {
    if let Ok(token) = std::env::var("TOM_HUB_TOKEN") {
        if token.is_empty()
            || headers.get("Authorization").and_then(|h| h.to_str().ok())
                != Some(format!("Bearer {token}").as_str())
        {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error":"Authentication required"})),
            );
        }
    }
    let data = body
        .map(|v| v.0)
        .unwrap_or_else(|| serde_json::to_value(query).unwrap_or(Value::Null));
    match hub
        .request(method.as_str(), uri.path().trim_start_matches("/api"), data)
        .await
    {
        Ok(value) => (StatusCode::OK, Json(value)),
        Err(error) => (StatusCode::BAD_REQUEST, Json(json!({"error":error}))),
    }
}
#[tokio::main]
async fn main() {
    let path = std::env::var_os("TOM_WORKSPACE")
        .map(PathBuf::from)
        .expect("Set TOM_WORKSPACE to a workspace.json path outside the checkout");
    let hub = Hub::open(path).expect("Could not open workspace");
    let app = Router::new()
        .route("/api/*path", any(request))
        .layer(axum::extract::DefaultBodyLimit::max(10_000_000))
        .with_state(hub);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787")
        .await
        .expect("Port 8787 is in use");
    eprintln!("Top-of-Mind Rust development gateway listening on 127.0.0.1:8787");
    axum::serve(listener, app).await.expect("Gateway failed");
}
