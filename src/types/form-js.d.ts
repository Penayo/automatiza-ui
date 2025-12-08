declare module '@bpmn-io/form-js' {

  export class Form {
    constructor(options?: any);
    importSchema(formSchema: any, options?: any);
    on(eventName: string, callback: (event: any) => void);
    submit(): { data: Record<string, any>, errors: any };
    setProperty(property: string, value: any): void;
    destroy(): void;
    // ... other methods and properties
  }
  
  export interface FormSchema {
    type: 'default' | 'form' | 'Form';
    version?: number;
    components: FormComponent[];
    id?: string;
  }

  export interface FormComponent {
    type: string;
    id: string;
    label?: string;
    description?: string;
    key?: string;
    validate?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      min?: number;
      max?: number;
    };
    disabled?: boolean;
    readonly?: boolean;
    defaultValue?: any;
    values?: Array<{ label: string; value: any }>;
  }

  export interface FormEditorOptions {
    container: HTMLElement | string;
    schema?: FormSchema;
    properties?: {
      [key: string]: any;
    };
    propertiesPanel?: {
      parent: HTMLElement | string;
    };
  }

  export interface FormEditorEvent {
    type: string;
    data?: any;
    error?: Error;
  }

  export interface FormEditor {
    on(event: string, callback: (event: FormEditorEvent) => void): void;
    off(event: string, callback: (event: FormEditorEvent) => void): void;
    attachTo(container: HTMLElement | string): void;
    detach(): void;
    destroy(): void;
    importSchema(schema: FormSchema): Promise<void>;
    saveSchema(): Promise<FormSchema>;
    getSchema(): FormSchema;
  }

  export interface FormEditorConstructor {
    createFormEditor(options: FormEditorOptions): Promise<FormEditor>;
  }

  export const FormEditor: FormEditorConstructor;

  // Common Form Component Types
  export interface TextFieldComponent extends FormComponent {
    type: 'textfield';
    subtype?: 'text' | 'email' | 'password' | 'tel';
  }

  export interface TextAreaComponent extends FormComponent {
    type: 'textarea';
    rows?: number;
  }

  export interface NumberComponent extends FormComponent {
    type: 'number';
    decimalDigits?: number;
  }

  export interface CheckboxComponent extends FormComponent {
    type: 'checkbox';
  }

  export interface SelectComponent extends FormComponent {
    type: 'select';
    values: Array<{ label: string; value: any }>;
    multiple?: boolean;
  }

  export interface DateTimeComponent extends FormComponent {
    type: 'datetime';
    subtype?: 'date' | 'time' | 'datetime';
    dateFormat?: string;
    timeFormat?: string;
  }

  export interface RadioComponent extends FormComponent {
    type: 'radio';
    values: Array<{ label: string; value: any }>;
    inline?: boolean;
  }

  export interface ButtonComponent extends FormComponent {
    type: 'button';
    action?: 'submit' | 'reset' | 'button';
  }

  // Form Events
  export type FormEditorEventType = 
    | 'import.done'
    | 'import.error'
    | 'save.done'
    | 'save.error'
    | 'selection.changed'
    | 'propertiesPanel.focusin'
    | 'propertiesPanel.focusout'
    | 'elements.changed'
    | 'destroy';

  export interface ImportDoneEvent extends FormEditorEvent {
    type: 'import.done';
    warnings: Array<string>;
  }

  export interface ImportErrorEvent extends FormEditorEvent {
    type: 'import.error';
    error: Error;
  }

  export interface SaveDoneEvent extends FormEditorEvent {
    type: 'save.done';
    schema: FormSchema;
  }

  export interface SaveErrorEvent extends FormEditorEvent {
    type: 'save.error';
    error: Error;
  }

  export interface SelectionChangedEvent extends FormEditorEvent {
    type: 'selection.changed';
    selection: FormComponent[];
  }

  export interface ElementsChangedEvent extends FormEditorEvent {
    type: 'elements.changed';
    elements: FormComponent[];
  }
}