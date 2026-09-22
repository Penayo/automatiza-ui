import type { APIData } from "@services/BaseService";
import { ModelApiService } from "@services/ModelAPI";
import type { ListQuery, PageResponse } from "@services/api";
import type { VueformPayload } from "@/formbuilder/types";

export interface IForm extends APIData {
    id: string;
    /** Stable, human-assigned reference used to point at this form from the BPMN modeler. */
    code: string;
    name: string;
    description?: string;
    /**
     * `vueform` is what the builder writes and `custom` points at a registered Vue view.
     * The rest are **retired**: forms the removed form-js designer ('default' | 'form' |
     * 'Form') and JSON-Schema editor ('jsonschema') left in the collection. They are kept
     * in the union so the list page can label them; nothing renders or edits them.
     */
    type: 'vueform' | 'custom' | 'default' | 'form' | 'Form' | 'jsonschema';
    /** Only set when type === 'custom'. Maps to a registered key in task-views/index.ts */
    key?: string;
    version: number;
    schemaVersion: number;
    /** Only set when type === 'vueform'. See src/formbuilder/types.ts for the payload shape. */
    vueform?: VueformPayload;
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

    /** Full list — used by pickers and previews that need every form. */
    async getAll(): Promise<IForm[]> {
        const data = await this.get<IForm[]>() ;
        return data as IForm[];
    }

    /** One page. `page` is what makes the backend return the envelope. */
    async getPage(params: ListQuery & { page: number }): Promise<PageResponse<IForm>> {
        return this.get<PageResponse<IForm>>('', { params });
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
