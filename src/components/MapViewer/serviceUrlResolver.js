const PROXY_PATH_PATTERN = /\/ogcproxy\//i;
const INTERNAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/i,
  /^0\.0\.0\.0$/i,
  /(^|\.)land\.copernicus\.eu$/i,
  /(^|\.)clms-staging\.eea\.europa\.eu$/i,
];

const stripProtocol = (url) => {
  return (url || '').replace(/^https?:\/\//i, '');
};

const getProxyBase = () => {
  const origin = window?.location?.origin || '';
  return origin ? `${origin}/ogcproxy/` : '/ogcproxy/';
};

const resolveAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  try {
    return new URL(url, window?.location?.origin || undefined);
  } catch (e) {
    return null;
  }
};

const isRelativeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url);
};

const isInternalHost = (hostname, currentHostname) => {
  const hostValue = String(hostname || '').toLowerCase();
  const currentHostValue = String(currentHostname || '').toLowerCase();
  if (!hostValue) {
    return false;
  }
  if (INTERNAL_HOST_PATTERNS.some((hostPattern) => hostPattern.test(hostValue))) {
    return true;
  }
  if (currentHostValue && hostValue === currentHostValue) {
    return true;
  }
  if (currentHostValue && hostValue.endsWith(`.${currentHostValue}`)) {
    return true;
  }
  if (currentHostValue && currentHostValue.endsWith(`.${hostValue}`)) {
    return true;
  }
  return false;
};

const isInternalAbsoluteUrl = (absoluteUrl) => {
  if (!absoluteUrl) {
    return false;
  }
  const currentOrigin = window?.location?.origin || '';
  const currentHostname = window?.location?.hostname || '';
  if (currentOrigin && absoluteUrl.origin === currentOrigin) {
    return true;
  }
  return isInternalHost(absoluteUrl.hostname, currentHostname);
};

const resolveUnproxiedUrl = (inputUrl) => {
  if (!inputUrl || !PROXY_PATH_PATTERN.test(inputUrl)) {
    return inputUrl;
  }
  const strippedUrl = stripProtocol(inputUrl);
  const proxyPathData = strippedUrl.split(PROXY_PATH_PATTERN)[1] || '';
  const normalizedPathData = proxyPathData.replace(/^\/+/, '');
  if (!normalizedPathData) {
    return inputUrl;
  }
  if (/^https?:\/\//i.test(normalizedPathData)) {
    return normalizedPathData;
  }
  const secureProtocol = window?.location?.protocol === 'http:' ? 'http://' : 'https://';
  return secureProtocol + normalizedPathData;
};

export const resolveServiceUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (!options.fromUploadWidget) {
    return url;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return trimmedUrl;
  }

  if (/^(blob:|data:|about:)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (isRelativeUrl(trimmedUrl) && !PROXY_PATH_PATTERN.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const alreadyProxied = PROXY_PATH_PATTERN.test(trimmedUrl);
  const unproxiedUrl = resolveUnproxiedUrl(trimmedUrl);
  const absoluteUrl = resolveAbsoluteUrl(unproxiedUrl);

  if (!absoluteUrl) {
    return trimmedUrl;
  }

  if (isInternalAbsoluteUrl(absoluteUrl)) {
    return absoluteUrl.toString();
  }

  const normalizedExternalUrl = stripProtocol(absoluteUrl.toString());
  if (alreadyProxied) {
    const proxyPathData = normalizedExternalUrl.replace(/^\/+/, '');
    return getProxyBase() + proxyPathData;
  }

  return getProxyBase() + normalizedExternalUrl;
};
