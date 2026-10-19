export type BookingDraft = { petId:string; serviceId:string; date:string; slot:string; note:string; savedAt:number };
const prefix='tailup_booking_draft_v2:';
export function readBookingDraft(customerId:string):BookingDraft|null {
  if(!customerId)return null;
  try{
    const raw=sessionStorage.getItem(prefix+customerId);
    if(!raw)return null;
    const draft=JSON.parse(raw) as BookingDraft;
    if(Date.now()-draft.savedAt<24*60*60*1000 && typeof draft.petId==='string' && typeof draft.serviceId==='string' && typeof draft.date==='string' && typeof draft.slot==='string' && typeof draft.note==='string')return draft;
    sessionStorage.removeItem(prefix+customerId);
  }catch{/* Storage might be disabled. */}
  return null;
}
export function writeBookingDraft(customerId:string,draft:Omit<BookingDraft,'savedAt'>){
  if(customerId)try{sessionStorage.setItem(prefix+customerId,JSON.stringify({...draft,savedAt:Date.now()}));}catch{/* Storage might be disabled. */}
}
export function clearBookingDraft(customerId:string){if(customerId)try{sessionStorage.removeItem(prefix+customerId);}catch{/* Storage might be disabled. */}}
