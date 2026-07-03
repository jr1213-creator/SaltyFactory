process.env.NAPI_RS_FORCE_WASI ??= "true";

const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
