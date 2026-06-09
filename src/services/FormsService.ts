import type { APIData } from "@services/BaseService";
import { ModelApiService } from "@services/ModelAPI";

export interface IForm extends APIData {
    id: string;
    name: string;
    description?: string;
    type: 'default' | 'form' | 'Form';
    version: number;
    schemaVersion: number;
    components: Array<{
        type: string;
        id: string;
        label?: string;
        key?: string;
        validate?: {
            required?: boolean;
            minLength?: number;
            maxLength?: number;
            pattern?: string;
            min?: number;
            max?: number;
        };
        [key: string]: any;
    }>;
    metadata?: { key: string; value: any }[];
    processDefinitionId?: string;
    taskDefinitionId?: string;
    _id?: string;
    __v?: string;
}

export class FormsService extends ModelApiService {
    constructor() {
        super("forms");
    }

    async getAll(): Promise<IForm[]> {
        const data = await this.get<IForm[]>() ;
        return data as IForm[];
    }

    async findById(id: string): Promise<IForm> {
        return this.get<IForm>(id) as Promise<IForm>;
    }

    async findByName(formName: string): Promise<IForm> {
        const url = `${formName}`;
        try {
            const response = await this.get<IForm>(url);
            return response as IForm;
        } catch (err) {
            this.handleErrors(err);
            throw err;
        }
    }

    save(formData: IForm) {
        const { _id, __v, createdAt, updatedAt, tenantId, ...payload } = formData as any;
        return this.post("", payload);
    }
};
