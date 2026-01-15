/// <reference types="vite/client" />

declare module '*.css?url' {
  const href: string
  export default href
}

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}
