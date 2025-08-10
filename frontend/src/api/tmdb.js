const baseUrl = "https://api.themoviedb.org/3";
const apiKey = process.env.REACT_APP_TMDB_API_KEY;
const bearerToken = process.env.REACT_APP_TMDB_BEARER_TOKEN;

// Fetch with API Key
export const fetchWithApiKey = async (endpoint) => {
  // automatic ? vs & handling
  const connector = endpoint.includes("?") ? "&" : "?";
  const response = await fetch(
    `${baseUrl}/${endpoint}${connector}api_key=${apiKey}`
  );
  if (!response.ok) throw new Error("Failed to fetch data");
  return response.json();
};

// Fetch with Bearer Token
export const fetchWithBearerToken = async (endpoint) => {
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch data");
  return response.json();
};

/**
 * Search TMDB for movies by title.
 * Returns an array of movie objects.
 */
export const searchMovies = async (query) => {
  const endpoint = `search/movie?query=${encodeURIComponent(
    query
  )}&language=en-US&page=1&include_adult=false`;
  const json = await fetchWithBearerToken(endpoint);
  return json.results || [];
};
