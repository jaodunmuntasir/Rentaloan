// Helper function to convert BigInt values to strings for JSON serialization
export const convertBigIntToString = (obj: any, processed = new WeakMap<object, any>()): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle circular references
  if (typeof obj === 'object') {
    // Return already processed objects to avoid infinite recursion
    if (processed.has(obj)) {
      return processed.get(obj);
    }
    
    if (Array.isArray(obj)) {
      const result: any[] = [];
      // Store the array in the WeakMap before processing its elements
      processed.set(obj, result);
      
      for (let i = 0; i < obj.length; i++) {
        result[i] = convertBigIntToString(obj[i], processed);
      }
      return result;
    } else {
      const result: any = {};
      // Store the object in the WeakMap before processing its properties
      processed.set(obj, result);
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = convertBigIntToString(obj[key], processed);
        }
      }
      return result;
    }
  }
  
  return obj;
}; 