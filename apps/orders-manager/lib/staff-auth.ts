import {createHmac,pbkdf2Sync,timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
const COOKIE='homey_sodfa_session',DAYS=7;
const sql=()=>{if(!process.env.DATABASE_URL)throw Error('DATABASE_NOT_CONFIGURED');return neon(process.env.DATABASE_URL)};
type Staff={id:string;email:string;displayName:string};
function secret(){const s=process.env.SESSION_SIGNING_SECRET||process.env.NEON_AUTH_COOKIE_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET_NOT_CONFIGURED');return s}
function sign(data:string){return createHmac('sha256',secret()).update(data).digest('base64url')}
export function setStaffCookie(user:Staff){const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Date.now()+DAYS*86400000})).toString('base64url');const value='v1.'+payload+'.'+sign('v1.'+payload);return COOKIE+'='+value+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+DAYS*86400+(process.env.NODE_ENV==='production'?'; Secure':'')}
export function clearStaffCookie(){return COOKIE+'=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(process.env.NODE_ENV==='production'?'; Secure':'')}
export async function getStaff(req:Request):Promise<Staff|null>{
 const cookie=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!cookie)return null;
 const parts=cookie.split('.');if(parts.length!==3||parts[0]!=='v1')return null;
 const current=sign(parts[0]+'.'+parts[1]);const a=Buffer.from(parts[2]);const b=Buffer.from(current);
 if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 let token:{sub?:string;exp?:number};
 try{token=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))}catch{return null}
 if(!token.sub||!token.exp||token.exp<Date.now()||!/^[0-9a-f-]{36}$/i.test(token.sub))return null;
 const rows=await sql()`SELECT id,email,display_name FROM public.staff_users WHERE id=${token.sub}::uuid AND is_active=true LIMIT 1`;
 if(!rows.length)return null;
 return {id:String(rows[0].id),email:String(rows[0].email),displayName:String(rows[0].display_name)};
}
function checkPassword(candidate:string,stored:string):boolean{
 const [algo,rounds,salt,target]=stored.split('$');
 if(algo!=='pbkdf2_sha256'||!rounds||!salt||!target)return false;
 const iterations=Number(rounds);if(iterations<100000||iterations>1000000)return false;
 const expected=Buffer.from(target,'base64');if(expected.length!==32)return false;
 const computed=pbkdf2Sync(candidate,Buffer.from(salt,'base64'),iterations,32,'sha256');
 return timingSafeEqual(expected,computed);
}
export async function authenticate(email:string,password:string):Promise<Staff|null>{
 const normalized=email.trim().toLowerCase();
 if(normalized.length>254||password.length>256)return null;
 const rows=await sql()`SELECT id,email,display_name,password_hash,locked_until FROM public.staff_users WHERE email=${normalized} AND is_active=true LIMIT 1`;
 if(!rows.length){pbkdf2Sync(password,Buffer.alloc(16),310000,32,'sha256');return null}
 const u=rows[0];
 if(u.locked_until&&new Date(String(u.locked_until)).getTime()>Date.now())return null;
 const valid=checkPassword(password,String(u.password_hash));
 if(!valid){await sql()`UPDATE public.staff_users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts+1>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=${u.id}::uuid`;return null}
 await sql()`UPDATE public.staff_users SET failed_attempts=0,locked_until=NULL WHERE id=${u.id}::uuid`;
 return {id:String(u.id),email:String(u.email),displayName:String(u.display_name)};
}
