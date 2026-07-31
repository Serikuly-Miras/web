use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_token: String,
    pub enable_docs: bool,
}

impl AppState {
    pub async fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let auth_token = std::env::var("AUTH_TOKEN").expect("AUTH_TOKEN must be set");
        let enable_docs = std::env::var("ENABLE_DOCS").is_ok_and(|v| v == "true");

        let pool = PgPoolOptions::new()
            .min_connections(5)
            .max_connections(5)
            .connect(&database_url)
            .await
            .expect("failed to connect to database");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("failed to run migrations");

        Self {
            pool,
            auth_token,
            enable_docs,
        }
    }
}
