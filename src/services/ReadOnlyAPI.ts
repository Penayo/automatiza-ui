import type { AxiosRequestConfig } from "axios";
import { BaseService } from "./BaseService";
import axios from 'axios';

export class ReadOnlyAPI extends BaseService {
  constructor(resource: string) {
    super(resource);
  }

  async fetch<T>(url: string = "", config?: AxiosRequestConfig): Promise<T | void> {
    try {
      config = config ?? {}
      config.headers = { ...this.getAuthorizationHeader() }

      const { data } = await axios.get(this.getUrl(url), config);
      if (data && data.statusCode === 401) {
        location.assign('#/login')
        return
      }
  
      return data;
    } catch (err) {
      this.handleErrors(err);
    }
  }

  async get<T>(id: string): Promise<T | void> {
    try {
      if (!id) throw Error("Id is not provided");

      const config: AxiosRequestConfig = {}
      config.headers = { ...this.getAuthorizationHeader() }

      const { data } = await axios.get(this.getUrl(id), config);
      if (data && data.statusCode === 401) {
        location.assign('#/login')
        return
      }

      return data ;
    } catch (err) {
      this.handleErrors(err);
    }
  }
}