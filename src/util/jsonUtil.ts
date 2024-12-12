
export function camel2Underline(camel: string): string {
  return camel.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function converJsonFromCamel2Underline(json: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(json).forEach((key) => {
    const value = json[key];
    const underlineKey = camel2Underline(key);
    result[underlineKey] = convertJsonValueFromCamel2Underline(value);
  });
  return result;
}

export function convertJsonValueFromCamel2Underline(val: any): any {
  if (Array.isArray(val)) {
    return val.map((item) => convertJsonValueFromCamel2Underline(item));
  } else if (typeof val === 'object') {
    return converJsonFromCamel2Underline(val);
  } else {
    return val;
  }
  return val;
}