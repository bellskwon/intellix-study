/**
 * Reads the access_token from the URL (set by our Google OAuth callback)
 * and persists it to localStorage so every page load can find it.
 *
 * The token is stored under 'base44_access_token' because that's the key
 * the AuthContext and the API client both read from.
 */

const TOKEN_KEY = 'base44_access_token';

const readAndStoreToken = () => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('access_token');

  if (tokenFromUrl) {
    localStorage.setItem(TOKEN_KEY, tokenFromUrl);

    // Remove the token from the URL so it isn't leaked in logs or shared links
    urlParams.delete('access_token');
    const cleanUrl =
      window.location.pathname +
      (urlParams.toString() ? `?${urlParams.toString()}` : '') +
      window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }
};

readAndStoreToken();

// Keep appParams exported so any remaining imports don't break
export const appParams = {
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
};
