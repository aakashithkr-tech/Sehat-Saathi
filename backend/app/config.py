from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./sehat_saathi.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    seed_sample_data: bool = False
    seed_verified_data: bool = True

    contact_rate_limit: int = Field(5, ge=1)
    contact_rate_window_seconds: int = Field(600, ge=1)
    contact_duplicate_window_seconds: int = Field(600, ge=1)
    client_hash_salt: str = "dev-only-salt"
    trust_proxy_headers: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_from: str = ""
    contact_notify_to: str = ""

    # Optional AI-powered educational synthesis (strictly opt-in and grounded in verified data)
    ai_guidance_enabled: bool = False
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip() and o.strip() != "*"]

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from and self.contact_notify_to)

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_guidance_enabled and self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()

