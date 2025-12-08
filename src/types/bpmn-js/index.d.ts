declare module 'bpmn-js/lib/Modeler' {
  interface ModelerOptions {
    container: string | HTMLElement;
    propertiesPanel?: {
      parent: string | HTMLElement;
    };
    additionalModules?: any[];
    moddleExtensions?: {
      [key: string]: any;
    };
    connectorsExtension?: {
      appendAnything?: boolean;
    };
  }

  class Modeler {
    constructor(options: ModelerOptions);
    importXML(xml: string): Promise<{ warnings: Array<any> }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    on(event: string, callback: (...args: any[]) => void): void;
    get(module: string): any;
    destroy(): void;
  }

  export default Modeler;
}