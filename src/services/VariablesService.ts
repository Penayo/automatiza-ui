import type { APIData } from "@services/BaseService";
import { ModelApiService } from "@services/ModelAPI";

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
