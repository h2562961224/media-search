import dotenv from 'dotenv';

dotenv.config();

const config = {
  PORT: process.env.PORT || 9527,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  SEARCH_ENGINE_USE_IMAGE: process.env.SEARCH_ENGINE_USE_IMAGE || 'false',
}

export default config;