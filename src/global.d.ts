declare const __DEV__: boolean;
declare const __NAME__: string; //Extension name, defined in packageJson.name
declare const __CONTENT_SCRIPT_ENTRY__: string;
declare const __BACKGROUND_ENTRY__: string;

declare module "*.vue" {
  const component: any;
  export default component;
}
