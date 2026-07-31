use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/push", post(push))
}

#[derive(Deserialize, ToSchema)]
pub struct PushMetrics {
    board_id: Uuid,
    #[schema(value_type = Object)]
    payload: serde_json::Value,
}

#[utoipa::path(
    post,
    path = "/api/v1/esp/push",
    request_body = PushMetrics,
    responses(
        (status = 201, description = "Metrics stored"),
        (status = 401, description = "Missing or invalid token"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "esp",
)]
pub async fn push(
    State(state): State<AppState>,
    Json(body): Json<PushMetrics>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query!(
        "insert into esp_readings (board_id, payload) values ($1, $2)",
        body.board_id,
        body.payload,
    )
    .execute(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::CREATED)
}
