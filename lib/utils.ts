export function cn(...inputs: (string | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ")
}

/**
 * BigInt 값을 포함한 객체를 JSON으로 직렬화 가능한 형태로 변환합니다.
 * BigInt 값은 문자열로 변환됩니다.
 * 
 * @param obj 변환할 객체
 * @returns BigInt 값이 문자열로 변환된 객체
 */
export function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

/**
 * BigInt 값을 처리할 수 있는 사용자 정의 JSON 직렬화 메서드입니다.
 * 
 * @param obj 직렬화할 객체
 * @returns 직렬화된 JSON 문자열
 */
export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
}

