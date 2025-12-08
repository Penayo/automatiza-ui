declare module 'camunda-bpmn-js-behaviors/lib/camunda-cloud' {
  interface BehaviorModule {
    __init__: string[];
    [key: string]: any;
  }

  const ZeebeBehaviorModule: BehaviorModule;
  export default ZeebeBehaviorModule;
}