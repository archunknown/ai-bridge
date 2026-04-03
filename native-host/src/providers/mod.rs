pub mod gemini;

use serde::Deserialize;
use std::path::PathBuf;

/// Trait común que todo proveedor de IA debe implementar.
#[async_trait::async_trait]
pub trait AiProvider {
    async fn complete(&self, prompt: &str) -> Result<String, String>;
}

/// Configuración cargada desde disco.
#[derive(Deserialize, Clone)]
pub struct ProviderConfig {
    pub default_provider: String,
    #[serde(default)]
    pub gemini_api_key: String,
    #[serde(default)]
    pub openai_api_key: String,
    #[serde(default)]
    pub anthropic_api_key: String,
    #[serde(default)]
    pub ollama_url: String,
}

impl ProviderConfig {
    pub fn load() -> Self {
        let path = config_path();
        match std::fs::read_to_string(&path) {
            Ok(contents) => toml::from_str(&contents).unwrap_or_else(|_| Self::default()),
            Err(_) => Self::default(),
        }
    }

    fn default() -> Self {
        Self {
            default_provider: "gemini".into(),
            gemini_api_key: String::new(),
            openai_api_key: String::new(),
            anthropic_api_key: String::new(),
            ollama_url: "http://localhost:11434".into(),
        }
    }
}

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-bridge")
        .join("config.toml")
}

/// Factoría: crea el proveedor correcto según el nombre.
pub fn create(name: &str, config: &ProviderConfig) -> Option<Box<dyn AiProvider + Send>> {
    match name {
        "gemini" => Some(Box::new(gemini::Gemini::new(&config.gemini_api_key))),
        _ => None,
    }
}
