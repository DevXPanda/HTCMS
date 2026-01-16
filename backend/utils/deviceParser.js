/**
 * Device and User Agent Parser Utility
 * Parses user agent string to extract device type, browser, and OS information
 */

/**
 * Extract IP address from request
 */
export const getIpAddress = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
};

/**
 * Get user agent from request
 */
export const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Detect device type from user agent
 */
export const detectDeviceType = (userAgent) => {
  if (!userAgent || userAgent === 'unknown') {
    return 'desktop';
  }

  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    // Check if it's a tablet
    if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
      return 'tablet';
    }
    return 'mobile';
  }

  // Desktop (default)
  return 'desktop';
};

/**
 * Detect browser name from user agent
 */
export const detectBrowser = (userAgent) => {
  if (!userAgent || userAgent === 'unknown') {
    return 'Unknown';
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident/')) return 'Internet Explorer';

  return 'Unknown';
};

/**
 * Detect operating system from user agent
 */
export const detectOS = (userAgent) => {
  if (!userAgent || userAgent === 'unknown') {
    return 'Unknown';
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes('windows nt')) {
    if (ua.includes('windows nt 10')) return 'Windows 10/11';
    if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
    if (ua.includes('windows nt 6.2')) return 'Windows 8';
    if (ua.includes('windows nt 6.1')) return 'Windows 7';
    return 'Windows';
  }
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone os') || ua.includes('ios')) return 'iOS';
  if (ua.includes('ipad')) return 'iPadOS';

  return 'Unknown';
};

/**
 * Detect source (web or mobile app)
 * This can be enhanced with custom headers from mobile apps
 */
export const detectSource = (req) => {
  // Check for custom header that mobile apps might send
  const sourceHeader = req.headers['x-app-source'];
  if (sourceHeader === 'mobile') {
    return 'mobile';
  }

  // Default to web
  return 'web';
};

/**
 * Parse all device information from request
 */
export const parseDeviceInfo = (req) => {
  const userAgent = getUserAgent(req);
  const ipAddress = getIpAddress(req);
  const deviceType = detectDeviceType(userAgent);
  const browserName = detectBrowser(userAgent);
  const operatingSystem = detectOS(userAgent);
  const source = detectSource(req);

  return {
    ipAddress,
    userAgent,
    deviceType,
    browserName,
    operatingSystem,
    source
  };
};
