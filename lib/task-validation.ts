import { statuses, assignees } from './task-types';
export class InputError extends Error {}
export function validateTask(input:unknown) {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new InputError('פרטי המשימה אינם תקינים.');
 const b=input as Record<string,unknown>;
 function str(key:string,max:number) { if(typeof b[key]!=='string'||(b[key] as string).length>max) throw new InputError('אחד הפרטים ארוך מדי או אינו תקין.'); return (b[key] as string).trim(); }
 const title=str('title',160), details=str('details',10000), topic=str('topic',80), due=str('due',10), assignee=str('assignee',20), status=str('status',10);
 if(!title) throw new InputError('צריך להוסיף כותרת למשימה.');
 if(!Object.hasOwn(statuses,status)||!Object.hasOwn(assignees,assignee)) throw new InputError('התיבה או השיוך אינם תקינים.');
 if(due && (!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due+'T12:00:00Z'))||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due)) throw new InputError('התאריך אינו תקין.');
 return {title,details,topic,due,assignee,status};
}
export function validateReference(input:unknown) {
 if(!input || typeof input!=='object') throw new InputError('המשימה אינה תקינה.');
 const {id,version}=input as Record<string,unknown>;
 if(typeof id!=='string'||! /^[0-9a-f-]{36}$/.test(id)||!Number.isSafeInteger(version)||Number(version)<1) throw new InputError('מזהה המשימה אינו תקין.');
 return {id,version:Number(version)};
}
