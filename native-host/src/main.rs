mod providers;

use providers::{AiProvider, ProviderConfig};
use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};

#[derive(Deserialize)]
struct Request {
    #[serde(rename = "type")]
    msg_type: String,
    prompt: Option<String>,
    provider: Option<String>,
}

#[derive(Serialize)]
struct Response {
    #[serde(rename = "type")]
    msg_type: String,
    text: Option<String>,
    provider: String,
    error: Option<String>,
}

/// Lee un mensaje del stdin usando el protocolo Native Messaging de Chrome:
/// 4 bytes (u32 little-endian) con la longitud, seguidos del JSON.
fn read_message() -> io::Result<Request> {
    let mut len_bytes = [0u8; 4];
    io::stdin().read_exact(&mut len_bytes)?;
    let len = u32::from_le_bytes(len_bytes) as usize;

    let mut buffer = vec![0u8; len];
    io::stdin().read_exact(&mut buffer)?;

    serde_json::from_slice(&buffer).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

/// Escribe un mensaje al stdout usando el mismo protocolo.
fn write_message(response: &Response) -> io::Result<()> {
    let json = serde_json::to_vec(response)?;
    let len = (json.len() as u32).to_le_bytes();

    let stdout = io::stdout();
    let mut handle = stdout.lock();
    handle.write_all(&len)?;
    handle.write_all(&json)?;
    handle.flush()
}

#[tokio::main]
async fn main() {
    let request = match read_message() {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[ai-bridge-host] Failed to read message: {}", e);
            return;
        }
    };

    if request.msg_type != "query" {
        let _ = write_message(&Response {
            msg_type: "response".into(),
            text: None,
            provider: "none".into(),
            error: Some(format!("Unknown message type: {}", request.msg_type)),
        });
        return;
    }

    let prompt = request.prompt.unwrap_or_default();
    let config = ProviderConfig::load();
    let provider_name = request.provider.unwrap_or(config.default_provider.clone());

    let result = match providers::create(&provider_name, &config) {
        Some(provider) => provider.complete(&prompt).await,
        None => Err(format!("Provider '{}' not configured", provider_name)),
    };

    let response = match result {
        Ok(text) => Response {
            msg_type: "response".into(),
            text: Some(text),
            provider: provider_name,
            error: None,
        },
        Err(e) => Response {
            msg_type: "response".into(),
            text: None,
            provider: provider_name,
            error: Some(e),
        },
    };

    let _ = write_message(&response);
}
