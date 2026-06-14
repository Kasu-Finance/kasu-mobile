// Allow side-effect + module CSS imports (used by the Expo web target / template).
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
