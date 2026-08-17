export const GET_CATALOGAPI_DATES_REQUEST = 'GET_CATALOGAPI_DATES_REQUEST';
export const GET_CATALOGAPI_DATES_SUCCESS = 'GET_CATALOGAPI_DATES_SUCCESS';
export const GET_CATALOGAPI_DATES_FAILURE = 'GET_CATALOGAPI_DATES_FAILURE';

const DEFAULT_CDSE_CLIENT_ID = 'sh-df6d3ec6-4590-4abf-9234-d8af40fcb92e';
const DEFAULT_CDSE_CLIENT_SECRET = 'KDluQ47jIy3p6pzdV50rkc8R1udgQMJ9';

function normalizeConfigValue(rawValue) {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim().replace(/;$/, '');
}

function resolveIsLocalMode() {
  if (process.env.RAZZLE_FORCE_DIRECT_CDSE_CATALOG === 'true') {
    return true;
  }
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  const hostname = String(window.location.hostname || '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

async function loadCatalogAccessToken() {
  const clientId = normalizeConfigValue(
    process.env.RAZZLE_CLIENT_ID ||
      process.env.CLIENT_ID ||
      DEFAULT_CDSE_CLIENT_ID,
  );
  const clientSecret = normalizeConfigValue(
    process.env.RAZZLE_CLIENT_SECRET ||
      process.env.CLIENT_SECRET ||
      DEFAULT_CDSE_CLIENT_SECRET,
  );
  const tokenUrl =
    process.env.RAZZLE_CDSE_TOKEN_URL ||
    process.env.CDSE_TOKEN_URL ||
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload && payload.access_token ? payload.access_token : null;
}

function buildCatalogPayloadFromFeatures(features = []) {
  const dateMap = {};
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;

  for (let i = 0; i < features.length; i++) {
    const featureData = features[i] || {};
    const properties = featureData.properties || {};
    const dateValue =
      properties.datetime ||
      properties.start_datetime ||
      properties.end_datetime;

    if (dateValue) {
      const normalizedDate = String(dateValue);
      const dateKey = new Date(normalizedDate).getTime();
      if (!Number.isNaN(dateKey)) {
        dateMap[dateKey] = normalizedDate;
      }
    }

    const bbox = Array.isArray(featureData.bbox) ? featureData.bbox : null;
    if (bbox && bbox.length >= 4) {
      const bxmin = Number(bbox[0]);
      const bymin = Number(bbox[1]);
      const bxmax = Number(bbox[2]);
      const bymax = Number(bbox[3]);
      if (Number.isFinite(bxmin) && bxmin < xmin) xmin = bxmin;
      if (Number.isFinite(bymin) && bymin < ymin) ymin = bymin;
      if (Number.isFinite(bxmax) && bxmax > xmax) xmax = bxmax;
      if (Number.isFinite(bymax) && bymax > ymax) ymax = bymax;
    }
  }

  const dateKeys = Object.keys(dateMap)
    .map((keyValue) => Number(keyValue))
    .filter((keyValue) => !Number.isNaN(keyValue))
    .sort((leftValue, rightValue) => leftValue - rightValue);
  const dates = dateKeys.map((dateKey) => dateMap[dateKey]);

  const payload = { dates };
  if (
    Number.isFinite(xmin) &&
    Number.isFinite(ymin) &&
    Number.isFinite(xmax) &&
    Number.isFinite(ymax)
  ) {
    payload.metadata = {
      bbox: [xmin, ymin, xmax, ymax],
      geometry: {
        crs: {
          properties: {
            name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
          },
        },
      },
    };
  }

  return payload;
}

async function fetchCatalogApiDatesDirect(byoc) {
  const accessToken = await loadCatalogAccessToken();
  if (!accessToken) {
    return null;
  }

  const normalizedByoc = String(byoc || '').replace(/^byoc-/i, '');
  if (!normalizedByoc) {
    return null;
  }

  const searchUrl =
    process.env.RAZZLE_CDSE_CATALOG_SEARCH_URL ||
    process.env.CDSE_CATALOG_SEARCH_URL ||
    'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';

  const collectionId = `byoc-${normalizedByoc}`;
  const defaultHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  const searchUrlData = new URL(searchUrl);
  searchUrlData.searchParams.set('collections', collectionId);
  searchUrlData.searchParams.set('limit', '1000');
  searchUrlData.searchParams.set('sortby', '+datetime');

  let response = await fetch(searchUrlData.toString(), {
    method: 'GET',
    headers: defaultHeaders,
  });

  if (!response.ok && (response.status === 405 || response.status === 406)) {
    response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collections: [collectionId],
        limit: 1000,
        sortby: [{ field: 'properties.datetime', direction: 'asc' }],
      }),
    });
  }

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return buildCatalogPayloadFromFeatures(features);
}

export function fetchCatalogApiDates(byoc, force_refresh = false) {
  return async (dispatch, getState) => {
    dispatch({ type: GET_CATALOGAPI_DATES_REQUEST, byoc });

    const isLocalMode = resolveIsLocalMode();
    if (isLocalMode) {
      try {
        const directPayload = await fetchCatalogApiDatesDirect(byoc);
        if (directPayload && Array.isArray(directPayload.dates)) {
          dispatch({
            type: GET_CATALOGAPI_DATES_SUCCESS,
            byoc,
            payload: directPayload,
          });
          return directPayload;
        }
      } catch (error) {}

      dispatch({
        type: GET_CATALOGAPI_DATES_FAILURE,
        byoc,
        error: 'Local direct CDSE catalog request failed',
      });
      return null;
    }

    const url = `/++api++/@get_catalogapi_dates?byoc=${encodeURIComponent(
      byoc,
    )}&force_refresh=${force_refresh ? 'true' : 'false'}`;

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();

      const hasDates = data && Array.isArray(data.dates);
      const hasBackendTokenConfigError =
        data &&
        data.type === 'InvalidParameterError' &&
        typeof data.message === 'string' &&
        data.message.includes('token_url');

      if (!res.ok || !hasDates || hasBackendTokenConfigError) {
        const directPayload = await fetchCatalogApiDatesDirect(byoc);
        if (directPayload && Array.isArray(directPayload.dates)) {
          dispatch({
            type: GET_CATALOGAPI_DATES_SUCCESS,
            byoc,
            payload: directPayload,
          });
          return directPayload;
        }

        throw new Error(
          hasBackendTokenConfigError
            ? data.message
            : 'Catalog dates request failed',
        );
      }

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
