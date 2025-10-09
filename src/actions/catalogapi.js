export const GET_CATALOGAPI_DATES_REQUEST = 'GET_CATALOGAPI_DATES_REQUEST';
export const GET_CATALOGAPI_DATES_SUCCESS = 'GET_CATALOGAPI_DATES_SUCCESS';
export const GET_CATALOGAPI_DATES_FAILURE = 'GET_CATALOGAPI_DATES_FAILURE';

export function fetchCatalogApiDates(byoc, force_refresh = false) {
  return async (dispatch, getState) => {
    dispatch({ type: GET_CATALOGAPI_DATES_REQUEST, byoc });
    const state = typeof getState === 'function' ? getState() : {};
    const lang =
      (state && state.intl && state.intl.locale) ||
      (state && state.userSession && state.userSession.lang) ||
      'en';
    const url = `/++api++/${encodeURIComponent(
      lang,
    )}/@get_catalogapi_dates?byoc=${encodeURIComponent(byoc)}&force_refresh=${
      force_refresh ? 'true' : 'false'
    }`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      dispatch({ type: GET_CATALOGAPI_DATES_SUCCESS, byoc, payload: data });
      return data;
    } catch (error) {
      dispatch({
        type: GET_CATALOGAPI_DATES_FAILURE,
        byoc,
        error: String(error),
      });
      return null;
    }
  };
}
