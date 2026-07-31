mod auth;
mod openapi;
mod routes;
mod state;

use axum::{Router, http::StatusCode, middleware, routing::get};
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable};

use auth::require_token;
use openapi::ApiDoc;
use state::AppState;

#[tokio::main]
async fn main() {
    let state = AppState::from_env().await;

    let api =
        routes::v1::router().layer(middleware::from_fn_with_state(state.clone(), require_token));

    let mut app = Router::new()
        .route("/health", get(|| async { StatusCode::OK }))
        .nest("/api/v1", api);

    if state.enable_docs {
        app = app.merge(Scalar::with_url("/docs", ApiDoc::openapi()));
    }

    let app = app.with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
