import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { navigateTo } from '@services/routerRef';

// Axios 1.x serializes arrays as keys[]=v (bracket notation). NestJS ValidationPipe
// with forbidNonWhitelisted:true rejects the literal "keys[]" property name.
// Serialize arrays as repeated plain keys instead: keys=v&keys=v.
function serializeParams(params: Record<string, any>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      val.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return parts.join('&');
}

export type ILog = {
  date: Date;
  type: "error" | "info" | "warning";
  title: string;
  message: string
}

export interface APIData {
  _id?: string;
  __v?: string;
}

export class BaseService {
  baseUrl = import.meta.env.VITE_API_HOST;
  resource;
  api: AxiosInstance;

  constructor(resource: string) {
    if (!resource) throw new Error("Resource is not provided");
    this.resource = resource;

    this.api = axios.create({
      baseURL: `${this.baseUrl}/${this.resource}`,
      headers: {
        ...this.getAuthorizationHeader()
      }
    });
  }

  async get<T>(url: string = "", config?: AxiosRequestConfig): Promise<T> {
    try {
      config = config ?? {}
      config.headers = this.getRequestHeaders()
      config.paramsSerializer = serializeParams;

      const { data } = await axios.get(this.getUrl(url), config);
      return data as T;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async post<T>(url?: string | Object, postData = {}, config?: AxiosRequestConfig): Promise<T> {
    if (typeof url === "object") {
      config = postData
      postData = url
      url = ''
    }

    try {
      config = config ?? {}
      config.headers = this.getRequestHeaders()

      const { data } = await axios.post(this.getUrl(url as string), postData, config);
      console.log({ data })
      return data;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async put<T>(id: string, putData = {}, config?: AxiosRequestConfig): Promise<T> {
    if (!id) throw Error("Id was not provided");

    try {
      config = config ?? {}
      config.headers = this.getRequestHeaders()
      const { data } = await axios.put(this.getUrl(id), putData, config);
      return data as T;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!id) throw Error("Id was not provided");

    try {
      await axios.delete(this.getUrl(id), { headers: this.getRequestHeaders() });
      return true;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  getUrl(url = "") {
    if ("" === url || !url)
      return `${this.baseUrl}/${this.resource}`

    return `${this.baseUrl}/${this.resource}/${url}`;
  }

  handleErrors(err: any) {
    console.log('API Error:', err);

    // Axios errors contain circular references — store only serializable fields.
    // Cap at 50 entries so this never fills localStorage.
    try {
      const errors = JSON.parse(localStorage.getItem('errors') || '[]');
      errors.push({
        message: err?.message,
        status: err?.response?.status ?? err?.status,
        url: err?.config?.url,
        ts: Date.now(),
      });
      localStorage.setItem('errors', JSON.stringify(errors.slice(-50)));
    } catch { /* ignore storage errors */ }

    const status = err?.response?.status ?? err?.status;

    // Handle 401 Unauthorized error
    if (status === 401) {
      localStorage.removeItem('token');
      navigateTo('/login');
      window.dispatchEvent(new CustomEvent('api-unauthorized'));
    }

    // Surface cross-cutting failures that components typically don't handle, so
    // they never fail silently again. 429 (rate limited) and network errors (no
    // response) are the usual silent culprits; a global listener in App.vue turns
    // these into a toast. Component-level errors (4xx/5xx with their own handling)
    // are left alone to avoid double toasts.
    if (status === 429) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { summary: 'Too many requests', message: 'Slow down for a moment and try again.' },
      }));
    } else if (!err?.response) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { summary: 'Network error', message: 'Could not reach the server. Check your connection and try again.' },
      }));
    }

    throw err;
  }

  getAuthorizationHeader () {
    const authToken = localStorage.getItem('token')

    if (authToken) {
      return {
        Authorization: `Bearer ${authToken}`
      }
    }

    return {}
  }

  // SUPER_ADMIN tenant switcher: the selected tenant is sent on every request as
  // X-Tenant-Id. The backend honors it only for SUPER_ADMIN (see tenant.interceptor.ts);
  // for any other user it is ignored and the JWT tenant is used.
  getTenantHeader () {
    const tenantId = localStorage.getItem('selectedTenantId')
    return tenantId ? { 'X-Tenant-Id': tenantId } : {}
  }

  getRequestHeaders () {
    return { ...this.getAuthorizationHeader(), ...this.getTenantHeader() }
  }
}
