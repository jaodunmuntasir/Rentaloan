// Helper function to convert BigInt values to strings for JSON serialization
export const convertBigIntToString = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle circular references
  if (typeof obj === 'object') {
    if (seen.has(obj)) {
      return obj; // Return the object without further processing to avoid recursion
    }
    seen.add(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item, seen));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntToString(obj[key], seen);
      }
    }
    return result;
  }
  
  return obj;
}; 