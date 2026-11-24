/// <reference types="vite/client" />

declare module "virtual:ozimek-localities" {
  const localities: import("./lib/locality").Locality[];
  export default localities;
}
