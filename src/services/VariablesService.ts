import type { APIData } from "./BaseService";
import { ModelApiService } from "./ModelAPI";

export interface IVariable extends APIData {
  name: string;
  value: string;
  type: string;
}

export class VariablesService extends ModelApiService {
  constructor() {
    super("variables");
  }
}
