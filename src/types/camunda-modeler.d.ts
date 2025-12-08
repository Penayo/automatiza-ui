declare module 'camunda-bpmn-js/lib/camunda-platform/Modeler' {
  interface ModelerOptions {
    container: string | HTMLElement;
    propertiesPanel?: {
      parent: string | HTMLElement;
    };
    additionalModules?: any[];
    moddleExtensions?: {
      camunda?: any;
      zeebe?: any;
    };
  }

  class BpmnModeler {
    constructor(options: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: Array<any> }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    on(event: string, callback: (...args: any[]) => void): void;
    get(module: string): any;
    destroy(): void;
  }

  export = BpmnModeler;
}
