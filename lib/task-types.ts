export type Status = 'active' | 'future' | 'done';
export type Task = { id:string; title:string; details:string; topic:string; location:string; for_child:'family'|'alma'|'liam'; due:string; assignee:string; status:Status; updated_at:string; updated_by:string; version:number };
export const statuses:Record<Status,string> = { active:'משימות', future:'ממתין לטיפול עתידי', done:'טופל' };
export const assignees:Record<string,string> = { together:'שנינו', husband:'שגיא', wife:'מאיה' };
