
import {useTranslation} from '@/app/language';
import type {CSSProperties} from 'react';

// Keep the user's original artwork unchanged. Put the image in /public with this exact file name.
// Next.js serves the file from the site root (not from /public in the URL).
export const HOMEY_LOGO_URL='/HOMEY-olive%20(3).png';

export function HomeyLogo({className='',style}:{className?:string;style?:CSSProperties}){
 const t=useTranslation();
 return <img src={HOMEY_LOGO_URL} alt={t("هومي HOMEY")} className={'homey-logo '+className} style={style} width={220} height={96} decoding="async"/>;
}
