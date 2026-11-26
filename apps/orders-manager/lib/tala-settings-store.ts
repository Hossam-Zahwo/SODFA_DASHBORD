import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {talaCredentialNames,talaDocumentation,talaEndpoint,talaSupport} from './tala-connection';
import type {Brand} from './types';

type Credentials = {username:string;password:string};
export type TalaSettings = {endpoint:string;documentation:string;support:string;revision:number;input:Credentials|null};

function db(){
 const url=process.env.ORDERS_MANAGER_DATABASE_URL;
 if(!url)throw new Error('Database unavailable');
 return neon(url);
}

function key(){
 const secret=process.env.TALA_SETTINGS_ENCRYPTION_SECRET || process.env.SESSION_SIGNING_SECRET || process.env.NEON_AUTH_COOKIE_SECRET;
 if(!secret||secret.length<32)throw new Error('Encryption key unavailable');
 return Buffer.from(hkdfSync('sha256',secret,'orders-manager','tala-settings-v1',32));
}

function seal(brand:Brand,input:Credentials){
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key(),iv);
 cipher.setAAD(Buffer.from(brand));
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(input),'utf8'),cipher.final()]);
 return [iv,cipher.getAuthTag(),ciphertext].map(value=>value.toString('base64url')).join('.');
}

function unseal(brand:Brand,value:string):Credentials{
 const [iv,tag,ciphertext]=value.split('.').map(part=>Buffer.from(part,'base64url'));
 const decipher=createDecipheriv('aes-256-gcm',key(),iv);
 decipher.setAAD(Buffer.from(brand));
 decipher.setAuthTag(tag);
 return JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8'));
}

export function allowedTalaEndpoint(endpoint:string){
 const configured=process.env.TALA_ALLOWED_ENDPOINTS?.split(',').map(value=>value.trim())??[];
 try{
  const url=new URL(endpoint);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash
   && [talaEndpoint,...configured].includes(url.href);
 }catch{return false}
}

export async function readTalaSettings(brand:Brand):Promise<TalaSettings>{
 let row;
 try{
  [row]=await db()`SELECT endpoint,documentation,support,credentials,revision FROM public.tala_connection_settings WHERE brand=${brand}`;
 }catch(error){
  if((error as {code?:string}).code!=='42P01')throw error;
 }
 if(row)return {
  endpoint:String(row.endpoint),documentation:String(row.documentation),support:String(row.support),
  revision:Number(row.revision),input:row.credentials?unseal(brand,String(row.credentials)):null,
 };
 const names=talaCredentialNames(brand);
 const username=process.env[names.username]?.trim(),password=process.env[names.password];
 return {endpoint:talaEndpoint,documentation:talaDocumentation,support:talaSupport,revision:0,
  input:username&&password?{username,password}:null};
}

export async function writeTalaSettings(brand:Brand,settings:TalaSettings,staffId:string){
 const credentials=settings.input?seal(brand,settings.input):null;
 const sql=db();
 const rows=settings.revision===0
  ?await sql`INSERT INTO public.tala_connection_settings(brand,endpoint,documentation,support,credentials,revision,updated_by)
    VALUES(${brand},${settings.endpoint},${settings.documentation},${settings.support},${credentials},1,${staffId}::uuid)
    ON CONFLICT(brand) DO NOTHING RETURNING revision`
  :await sql`UPDATE public.tala_connection_settings SET endpoint=${settings.endpoint}, documentation=${settings.documentation},
    support=${settings.support}, credentials=${credentials}, updated_by=${staffId}::uuid,
    updated_at=now(), revision=revision+1 WHERE brand=${brand} AND revision=${settings.revision} RETURNING revision`;
 return rows.length>0;
}
