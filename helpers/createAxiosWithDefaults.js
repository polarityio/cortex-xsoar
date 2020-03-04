const axios = require("axios");
const fs = require("fs");
const https = require("https");

const {
  request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
} = require("../config/config");

const _configFieldIsValid = (field) => typeof field === "string" && field.length > 0;

const createAxiosWithDefaults = (tokenCache, Logger) => {
  const axiosWithDefaults = axios.create({
    httpsAgent: new https.Agent({
      ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
      ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
      ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
      ...(_configFieldIsValid(passphrase) && { passphrase }),
      ...(typeof rejectUnauthorized === "boolean" && { rejectUnauthorized })
    }),
    ...(proxy && { proxy: { host: proxy } })
  });

  const handleAndReformatErrors = (err) => {
    if (err.response) {
      const custom_error = new Error(
        err.response.statusText || "Internal server error"
      );
      custom_error.status = err.response.status || 500;
      custom_error.description = err.message;

      throw custom_error;
    }
    throw err;
  };

  axiosWithDefaults.interceptors.response.use((r) => r, handleAndReformatErrors);

  return axiosWithDefaults;
};

module.exports = createAxiosWithDefaults;
