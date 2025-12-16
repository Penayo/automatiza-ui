import { ModelApiService } from "./ModelAPI";

export interface IPerson {
    _id?: string;
    type: 'NaturalPerson' | 'LegalPerson';
}

export interface INaturalPerson extends IPerson {
    type: 'NaturalPerson';
    firstName: string;
    lastName: string;
    documentId: string;
}

export interface ILegalPerson extends IPerson {
    type: 'LegalPerson';
    companyName: string;
    alias?: string;
    businessId: string;
}

export class PersonService extends ModelApiService {
    constructor() {
        super("persons");
    }

    getPerson(id: string): Promise<IPerson> {
        return this.api.get(this.getUrl(id))
            .then((d) => d.data) as Promise<IPerson>;
    }
}