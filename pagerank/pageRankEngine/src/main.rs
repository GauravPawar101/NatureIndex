mod recommendation;

use redis::aio::ConnectionManager;
use std::{env, error::Error};
use tokio_postgres_rustls::MakeRustlsConnect;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Load a local .env if one happens to exist, but don't require it: in
    // production and in CI the environment is injected directly, and the old
    // `panic!` here made the binary refuse to start anywhere without a
    // committed .env file.
    let _ = dotenvy::dotenv();
    let db_url = env::var("DB_URL").expect("DB_URL not set");
    let redis_url = env::var("REDIS_URL").expect("REDIS_URL not set");

    println!("Initializing Database and Cache connections...");

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls ring CryptoProvider — check for conflicting rustls crypto backend features (ring vs aws-lc-rs) with `cargo tree -e features -i rustls`");

    // 1. Initialize Postgres Client (Supabase)
    //
    // Supabase issues its own project TLS certificate signed by Supabase's
    // own CA, not a publicly-trusted CA — so neither webpki-roots (Mozilla's
    // public CA list) nor the OS trust store will ever validate it, on any
    // machine, which is why UnknownIssuer persisted regardless of pooler vs
    // direct connection. Supabase's own docs confirm this and show reading
    // this exact cert file to fix it: https://supabase.com/docs/guides/platform/ssl-enforcement
    //
    // include_bytes! embeds the cert into the compiled binary at build time,
    // so this works identically in GitHub Actions (checkout provides the
    // repo file before `cargo build` runs) as it does locally — no runtime
    // file path, no network fetch, nothing environment-specific to fail.
    // This is not a secret; Supabase distributes the same CA file
    // (prod-ca-2021.crt) across all hosted projects, so it's fine to commit.
    const SUPABASE_CA_PEM: &[u8] = include_bytes!("../certs/prod-ca-2021.crt");

    let mut root_store = rustls::RootCertStore::empty();
    // Keep webpki-roots too, in case this service ever talks to any other
    // TLS endpoint that DOES use a publicly-trusted cert.
    root_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());

    let mut ca_reader = std::io::BufReader::new(SUPABASE_CA_PEM);
    for cert in rustls_pemfile::certs(&mut ca_reader) {
        let cert = cert.expect("Invalid certificate in embedded Supabase CA file");
        root_store
            .add(cert)
            .expect("Failed to add Supabase CA cert to root store");
    }

    let tls_config = rustls::ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth();
    let tls = MakeRustlsConnect::new(tls_config);

    // NOTE: db_url should be Supabase's *direct* connection string (port
    // 5432, not the 6543 pgbouncer pooler in transaction mode) — tokio-postgres
    // uses prepared statements which transaction-mode pooling breaks.
    let (pg_client, connection) = tokio_postgres::connect(&db_url, tls).await?;
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("PostgreSQL connection error: {}", e);
        }
    });

    // 2. Initialize Redis Connection Manager
    let redis_client = redis::Client::open(redis_url.as_str())?;
    let mut redis_conn = ConnectionManager::new(redis_client).await?;

    println!("Connections initialized. Running scheduled PageRank sync...");

    // 3. Global Job: Compute PageRank for all posts and write-through to Redis & Postgres
    recommendation::compute_and_sync_pagerank(&pg_client, &mut redis_conn).await?;

    println!("PageRank cron job completed successfully.");
    Ok(())
}
