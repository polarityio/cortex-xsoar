const { TIME_FOR_TOKEN_DAYS } = require("./constants");

const getAuthToken = async (
  { username, password, baseUrl },
  axiosWithDefaults,
  tokenCache
) => {
  const authCacheKey = `${username}${password}`;

  const cachedToken = tokenCache.get(authCacheKey);
  if (cachedToken) return cachedToken;

  const { data: newToken } = await axiosWithDefaults.get(
    `${baseUrl}/Snypr/ws/token/generate`,
    {
      headers: {
        username,
        password,
        tenant: "Securonix",
        validity: TIME_FOR_TOKEN_DAYS
      }
    }
  ).then(result => result || { data: null });

  if (newToken) tokenCache.set(authCacheKey, newToken);

  return newToken;
};

module.exports = getAuthToken;
