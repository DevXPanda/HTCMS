/**
 * Utility functions for handling query parameters safely
 */

/**
 * Safely extracts property ID from query parameters
 * Supports both formats:
 * - propertyId=7
 * - propertyId[id]=7&propertyId[propertyNumber]=22
 * 
 * @param {Object} query - Express request query object
 * @returns {number|null} - Extracted property ID as integer or null if invalid
 */
export const extractPropertyId = (query) => {
  if (!query.propertyId) {
    return null;
  }

  // Handle case where propertyId is an object: { id: 7, propertyNumber: 22 }
  if (typeof query.propertyId === 'object' && query.propertyId !== null) {
    return query.propertyId.id ? parseInt(query.propertyId.id) : null;
  }

  // Handle case where propertyId is a string or number: "7" or 7
  const propertyId = parseInt(query.propertyId);
  return isNaN(propertyId) ? null : propertyId;
};

/**
 * Validates property ID and throws error if invalid
 * @param {Object} query - Express request query object
 * @param {string} fieldName - Field name for error message (default: 'propertyId')
 * @returns {number} - Validated property ID
 * @throws {Error} - If property ID is missing or invalid
 */
export const validatePropertyId = (query, fieldName = 'propertyId') => {
  const propertyId = extractPropertyId(query);
  
  if (!propertyId) {
    throw new Error(`Invalid ${fieldName}: Property ID is required and must be a valid number`);
  }
  
  return propertyId;
};

/**
 * Safely extracts any ID from query parameters
 * Supports both formats:
 * - id=7
 * - id[id]=7&id[name]=test
 * 
 * @param {Object} query - Express request query object
 * @param {string} paramName - Parameter name (default: 'id')
 * @returns {number|null} - Extracted ID as integer or null if invalid
 */
export const extractId = (query, paramName = 'id') => {
  if (!query[paramName]) {
    return null;
  }

  // Handle case where parameter is an object: { id: 7, name: 'test' }
  if (typeof query[paramName] === 'object' && query[paramName] !== null) {
    return query[paramName].id ? parseInt(query[paramName].id) : null;
  }

  // Handle case where parameter is a string or number: "7" or 7
  const id = parseInt(query[paramName]);
  return isNaN(id) ? null : id;
};

/**
 * Validates any ID and throws error if invalid
 * @param {Object} query - Express request query object
 * @param {string} paramName - Parameter name (default: 'id')
 * @param {string} fieldName - Field name for error message (default: 'ID')
 * @returns {number} - Validated ID
 * @throws {Error} - If ID is missing or invalid
 */
export const validateId = (query, paramName = 'id', fieldName = 'ID') => {
  const id = extractId(query, paramName);
  
  if (!id) {
    throw new Error(`Invalid ${fieldName}: ${paramName} is required and must be a valid number`);
  }
  
  return id;
};
