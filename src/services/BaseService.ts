import axios, { Axios, type AxiosInstance, type AxiosRequestConfig } from 'axios';

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

  async get<T>(url: string = "", config?: AxiosRequestConfig): Promise<T | void> {
    try {
      config = config ?? {}
      config.headers = { ...this.getAuthorizationHeader() }

      const { data } = await axios.get(this.getUrl(url), config);
      return data as T;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async post<T>(url?: string | Object, postData = {}, config?: AxiosRequestConfig): Promise<T | void> {
    if (typeof url === "object") {
      config = postData
      postData = url
      url = ''
    }

    try {
      config = config ?? {}
      config.headers = { ...this.getAuthorizationHeader() }

      const { data } = await axios.post(this.getUrl(url as string), postData, config);
      console.log({ data })
      return data;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async put(id: string, data = {}, config?: AxiosRequestConfig) {
    if (!id) throw Error("Id was not provided");

    try {
      config = config ?? {}
      config.headers = { ...this.getAuthorizationHeader() }
      const response = await axios.patch(this.getUrl(id), data, config);
      return response;
    } catch (err) {
      this.handleErrors(err);
      throw err;
    }
  }

  async delete(id: string) {
    if (!id) throw Error("Id was not provided");
    try {
      await axios.delete(this.getUrl(id));
      return true;
    } catch (err) {
      this.handleErrors(err);
    }
  }

  getUrl(url = "") {
    if ("" === url || !url)
      return `${this.baseUrl}/${this.resource}`

    return `${this.baseUrl}/${this.resource}/${url}`;
  }

  handleErrors(err: any) {
    const errors = JSON.parse(localStorage.getItem('errors') || '[]');
    errors.push(err);
    console.log('API Error:', err);

    localStorage.setItem('errors', JSON.stringify(errors));
    // Handle 401 Unauthorized error
    if (err?.response?.status === 401 || err?.status === 401) {
      // Optionally clear tokens, redirect, or show login
      localStorage.removeItem('token');
      window.location.assign('/#/login');
      window.dispatchEvent(new CustomEvent('api-unauthorized'));
    }

    throw err;
  }

  getAuthorizationHeader () {
    const authToken = localStorage.getItem('token')

    if (authToken) {
      return {
        Authorization: `Bearer ${authToken}`
      }
    } else {
      location.assign('/#/login')
    }

    return {}
  }  
}