const loginQuery='mutation Login($input: LoginInput!) { login(input: $input) { token } }';
const tokens = new Map<string,{token:string; expiresAt:number}>();
const logins = new Map<string,Promise<string>>();

export class TalaError extends Error {
 constructor(readonly code: 'unreachable'|'unauthenticated'|'forbidden'|'rejected') { super(code); }
}

export async function graphql<T>(endpoint:string,query: string, variables: object, language: 'ar'|'en', token?: string): Promise<T> {
 let response: Response;
 try {
  response = await fetch(endpoint, {
   method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
   headers: {'Content-Type':'application/json','Content-Language':language,...(token?{Authorization:'Bearer '+token}:{})},
   body: JSON.stringify({query,variables}),
  });
 } catch { throw new TalaError('unreachable'); }
 if (response.status === 401) throw new TalaError('unauthenticated');
 if (response.status === 403) throw new TalaError('forbidden');
 if (!response.ok) throw new TalaError('unreachable');
 const result = await response.json().catch(() => null);
 const errors:Array<{message?:string;extensions?:{code?:string}}> = Array.isArray(result?.errors)?result.errors:[];
 if (errors.some(error=>error.extensions?.code==='UNAUTHENTICATED'||/^Unauthenticated\.?$/i.test(error.message??''))) {
  throw new TalaError('unauthenticated');
 }
 if (errors.some(error=>['FORBIDDEN','ACCESS_DENIED','UNAUTHORIZED'].includes(error.extensions?.code??'')||/^This action is unauthorized\.?$/i.test(error.message??''))) {
  throw new TalaError('forbidden');
 }
 if (errors.length || !result?.data) throw new TalaError('rejected');
 return result.data;
}

export async function login(cacheKey:string,endpoint:string,input: {username:string;password:string}) {
 const cached=tokens.get(cacheKey);
 if (cached && cached.expiresAt > Date.now()) return cached.token;
 for(const [id,entry] of tokens)if(entry.expiresAt<=Date.now())tokens.delete(id);
 let pending=logins.get(cacheKey);
 if (!pending) {
  pending=graphql<{login:{token:string}}>(endpoint,loginQuery,{input:{...input,rememberMe:true}},'en').then(({login})=>{
   if (!login?.token) throw new TalaError('rejected');
   tokens.set(cacheKey,{token:login.token,expiresAt:Date.now()+60*60*1000});
   return login.token;
  }).finally(()=>logins.delete(cacheKey));
  logins.set(cacheKey,pending);
 }
 return pending;
}


export function invalidateTalaToken(key:string,token:string){
 if(tokens.get(key)?.token===token)tokens.delete(key);
}
