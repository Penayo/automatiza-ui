declare module 'bpmn-js-element-templates' {
  interface ElementTemplate {
    id: string;
    name: string;
    description?: string;
    version?: number;
    appliesTo: string[];
    properties: ElementTemplateProperty[];
    scopes?: ElementTemplateScope[];
  }

  interface ElementTemplateProperty {
    binding: {
      type: string;
      name?: string;
      source?: string;
      key?: string;
    };
    label?: string;
    description?: string;
    type: string;
    value?: any;
    choices?: Array<{
      name: string;
      value: any;
    }>;
  }

  interface ElementTemplateScope {
    type: string;
    properties: ElementTemplateProperty[];
  }

  interface ElementTemplatesModule {
    __init__: string[];
    elementTemplates: any[];
    elementTemplatesLoader: any;
    elementTemplatesValidator: any;
  }

  export const ElementTemplatesModule: ElementTemplatesModule;
  export const ElementTemplatesPropertiesProviderModule: any;
  export const CloudElementTemplatesPropertiesProviderModule: any;

  // Events
  interface ElementTemplatesEvents {
    'elementTemplates.errors': (event: { errors: Array<Error> }) => void;
    'elementTemplates.changed': () => void;
  }

  // API
  interface ElementTemplatesAPI {
    get(id: string, version?: number): ElementTemplate | undefined;
    getAll(): ElementTemplate[];
    set(templates: ElementTemplate[]): void;
    validate(template: ElementTemplate): Error[];
  }
}
