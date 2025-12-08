declare module 'bpmn-js-properties-panel' {
  interface ModuleDeclaration {
    [key: string]: any;
  }

  export interface PropertiesPanelOptions {
    parent: string | HTMLElement;
    container?: string | HTMLElement;
  }

  export interface BpmnPropertiesPanelModule extends ModuleDeclaration {
    __init__: string[];
    propertiesProvider: string[];
  }

  export interface BpmnPropertiesProviderModule extends ModuleDeclaration {
    __init__: string[];
    propertiesProvider: string[];
  }

  export const BpmnPropertiesPanelModule: BpmnPropertiesPanelModule;
  export const BpmnPropertiesProviderModule: BpmnPropertiesProviderModule;
  export const ZeebePropertiesProviderModule: ModuleDeclaration;
  export const ZeebeModdleModule: ModuleDeclaration;
}

declare module 'bpmn-js-properties-panel/lib/PropertiesPanel' {
  import { ModuleDeclaration } from 'didi';
  
  class PropertiesPanel implements ModuleDeclaration {
    constructor(config: any);
    _init(): void;
    attachTo(parent: HTMLElement): void;
    detach(): void;
    destroy(): void;
  }

  export default PropertiesPanel;
}

declare module 'bpmn-js-properties-panel/lib/provider/bpmn' {
  import { ModuleDeclaration } from 'didi';
  
  export const BpmnPropertiesProvider: ModuleDeclaration;
}
