/**
 * Next.js Test Setup and Mocks
 */

// Mock Next.js Request and Response
class MockRequest {
  constructor(public url: string, public init?: RequestInit) {}
  
  async json() {
    return {};
  }
  
  async formData() {
    return new FormData();
  }
}

class MockResponse {
  constructor(public body?: any, public init?: ResponseInit) {}
  
  static json(data: any, init?: ResponseInit) {
    return new MockResponse(JSON.stringify(data), init);
  }
}

// Set up global mocks
Object.defineProperty(global, 'Request', { value: MockRequest });
Object.defineProperty(global, 'Response', { value: MockResponse });

// Mock FormData if not available
if (typeof FormData === 'undefined') {
  global.FormData = class MockFormData {
    private data = new Map<string, any>();
    
    append(key: string, value: any) {
      this.data.set(key, value);
    }
    
    get(key: string) {
      return this.data.get(key);
    }
    
    has(key: string) {
      return this.data.has(key);
    }
  } as any;
}

// Mock File if not available
if (typeof File === 'undefined') {
  global.File = class MockFile {
    constructor(
      public bits: any[],
      public name: string,
      public options?: { type?: string }
    ) {}
    
    get type() {
      return this.options?.type || '';
    }
  } as any;
}

export { MockRequest, MockResponse };