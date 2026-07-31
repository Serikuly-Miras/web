create table
    esp_readings (
        id bigint generated always as identity primary key,
        board_id uuid not null,
        recorded_at timestamptz not null default now(),
        payload jsonb not null
    );

create index on esp_readings using brin (recorded_at);

create index on esp_readings using gin (payload);

create index on esp_readings (board_id, recorded_at);