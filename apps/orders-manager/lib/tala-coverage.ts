import {govs} from './types';
import type {TalaOption} from './tala-connection';

export type TalaCoverageGroup={zone:TalaOption;subzones:TalaOption[]};

export function normalizeTalaAreaName(value:string){
 return value.normalize('NFKD').replace(/[\p{M}ـ]/gu,'')
  .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().trim()
  .replace(/^(?:محافظه|governorate)\s*/,'')
  .replace(/^(?:مدينه|مركز|قسم|حي|حى|بندر)\s*/,'')
  .replace(/^ال/,'').replace(/[^\p{L}\p{N}]/gu,'');
}

export function providerZoneGovernorates(group:TalaCoverageGroup,locations:Record<string,string[]>){
 const root=normalizeTalaAreaName(group.zone.name);
 const direct=govs.filter(governorate=>normalizeTalaAreaName(governorate)===root);
 if(direct.length===1)return direct;

 const rootMatches=govs.filter(governorate=>(locations[governorate]??[])
  .some(area=>normalizeTalaAreaName(area)===root));
 if(rootMatches.length===1)return rootMatches;

 const childMatches=new Set(govs.filter(governorate=>(locations[governorate]??[])
  .some(area=>group.subzones.some(child=>normalizeTalaAreaName(child.name)===normalizeTalaAreaName(area)))));
 if(childMatches.size===1)return [...childMatches];
 return [];
}
