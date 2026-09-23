from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    pagespeed_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()