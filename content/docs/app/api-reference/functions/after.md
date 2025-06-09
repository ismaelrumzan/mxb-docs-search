---
title: After
path: "App / Api Reference / Functions / After"
source_url: https://nextjs.org/docs/app/api-reference/functions/after
content_length: 4674
---

# after
`after` allows you to schedule work to be executed after a response (or prerender) is finished. This is useful for tasks and other side effects that should not block the response, such as logging and analytics.
It can be used in Server Components (including `generateMetadata`), Server Actions, Route Handlers, and Middleware.
The function accepts a callback that will be executed after the response (or prerender) is finished:
app/layout.tsx
```
import { after } from'next/server'
// Custom logging function
import { log } from'@/app/utils'
exportdefaultfunctionLayout({ children }: { children:React.ReactNode }) {
after(() => {
// Execute after the layout is rendered and sent to the user
log()
 })
return <>{children}</>
}
```

> **Good to know:** `after` is not a Dynamic API and calling it does not cause a route to become dynamic. If it's used within a static page, the callback will execute at build time, or whenever a page is revalidated.
## Reference
### Parameters
  * A callback function which will be executed after the response (or prerender) is finished.


### Duration
`after` will run for the platform's default or configured max duration of your route. If your platform supports it, you can configure the timeout limit using the `maxDuration` route segment config.
## Good to know
  * `after` will be executed even if the response didn't complete successfully. Including when an error is thrown or when `notFound` or `redirect` is called.
  * You can use React `cache` to deduplicate functions called inside `after`.
  * `after` can be nested inside other `after` calls, for example, you can create utility functions that wrap `after` calls to add additional functionality.


## Examples
### With request APIs
You can use request APIs such as `cookies` and `headers` inside `after` in Server Actions and Route Handlers. This is useful for logging activity after a mutation. For example:
app/api/route.ts
```
import { after } from'next/server'
import { cookies, headers } from'next/headers'
import { logUserAction } from'@/app/utils'
exportasyncfunctionPOST(request:Request) {
// Perform mutation
// ...
// Log user activity for analytics
after(async () => {
constuserAgent= (awaitheaders().get('user-agent')) ||'unknown'
constsessionCookie=
   (awaitcookies().get('session-id'))?.value ||'anonymous'
logUserAction({ sessionCookie, userAgent })
 })
returnnewResponse(JSON.stringify({ status:'success' }), {
  status:200,
  headers: { 'Content-Type':'application/json' },
 })
}
```

However, you cannot use these request APIs inside `after` in Server Components. This is because Next.js needs to know which part of the tree access the request APIs to support Partial Prerendering, but `after` runs after React's rendering lifecycle.
## Platform Support
Deployment Option| Supported  
---|---  
Node.js server| Yes  
Docker container| Yes  
Static export| No  
Adapters| Platform-specific  
Learn how to configure `after` when self-hosting Next.js.
Reference: supporting `after` for serverless platforms Using `after` in a serverless context requires waiting for asynchronous tasks to finish after the response has been sent. In Next.js and Vercel, this is achieved using a primitive called `waitUntil(promise)`, which extends the lifetime of a serverless invocation until all promises passed to have settled.
If you want your users to be able to run `after`, you will have to provide your implementation of `waitUntil` that behaves in an analogous way.
When `after` is called, Next.js will access `waitUntil` like this:
```
constRequestContext= globalThis[Symbol.for('@next/request-context')]
constcontextValue=RequestContext?.get()
constwaitUntil=contextValue?.waitUntil
```

Which means that `globalThis[Symbol.for('@next/request-context')]` is expected to contain an object like this:
```
typeNextRequestContext= {
get():NextRequestContextValue|undefined
}
typeNextRequestContextValue= {
waitUntil?: (promise:Promise<any>) =>void
}
```

Here is an example of the implementation.
```
import { AsyncLocalStorage } from'node:async_hooks'
constRequestContextStorage=newAsyncLocalStorage<NextRequestContextValue>()
// Define and inject the accessor that next.js will use
constRequestContext:NextRequestContext= {
get() {
returnRequestContextStorage.getStore()
 },
}
globalThis[Symbol.for('@next/request-context')] = RequestContext
consthandler= (req, res) => {
constcontextValue= { waitUntil:YOUR_WAITUNTIL }
// Provide the value
returnRequestContextStorage.run(contextValue, () =>nextJsHandler(req, res))
}
```

## Version History
Version History| Description  
---|---  
`v15.1.0`| `after` became stable.  
`v15.0.0-rc`| `unstable_after` introduced.
