// Allow CSS files to be imported as side-effects (e.g. import './globals.css')
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
