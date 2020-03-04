const axios = require("axios");
const fs = require("fs");
const https = require("https");

const {
  request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
} = require("../config/config");
const getAuthToken = require("./getAuthToken");

const MAX_AUTH_RETRIES = 1;
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

  const handleAuth = async (request) => {
    const isAuthRequest = request.headers.validity
    if (!isAuthRequest) {
      const token = await getAuthToken(request.headers, axiosWithDefaults, tokenCache)
        .catch((error) => {
          Logger.error({ error }, "Unable to retrieve Auth Token");
          throw error;
        });
      Logger.trace({ token }, "Token");

      return {
        ...request,
        headers: {
          ...request.headers,
          token
        }
      };
    }

    return request;
  };

  const handleAndReformatErrors = (err) => {
    if (err.response) {
      const retryCount = (err.config && err.config.headers.retryCount) || 0;

      const needToRetryRequest =
        err.response.status === 403 && err.config && retryCount <= MAX_AUTH_RETRIES;

      if (needToRetryRequest) {
        const { username, password } = err.config.headers;
        const authCacheKey = `${username}${password}`;
        tokenCache.del(authCacheKey);

        return axiosWithDefaults.request({
          ...err.config,
          headers: { ...err.config.headers, retryCount: retryCount + 1 }
        });
      } else {
        const custom_error = new Error(
          err.response.statusText || "Internal server error"
        );
        custom_error.status = err.response.status || 500;
        custom_error.description = err.message;

        throw custom_error;
      }
    }
    throw err;
  };

  axiosWithDefaults.interceptors.request.use(handleAuth);

  axiosWithDefaults.interceptors.response.use((r) => r, handleAndReformatErrors);

  return axiosWithDefaults;
};

module.exports = createAxiosWithDefaults;
