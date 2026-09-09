export type ShoppingStatus = 'now' | 'future' | 'done';
export type ShoppingItem = {
  id:string;
  name:string;
  quantity:string;
  notes:string;
  status:ShoppingStatus;
  updated_at:string;
  updated_by:string;
  version:number;
};
export const shoppingStatuses:Record<ShoppingStatus,string> = {
  now:'לקנייה עכשיו',
  future:'לזכור להמשך',
  done:'נקנה'
};
