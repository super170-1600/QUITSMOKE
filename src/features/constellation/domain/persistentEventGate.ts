/** Local animation consumption only; durable event identity always comes from the server. */
export function createPersistentEventGate(){
 let scope='',seen=new Set<string>()
 return {
  consume(accountScope:string,receipt:{eventId:string|null;transitioned:boolean;plan:{status:string;source:string}}){
   if(scope!==accountScope){scope=accountScope;seen.clear()}
   if(!receipt.transitioned||receipt.plan.source!=='real'||receipt.plan.status!=='completed'||!receipt.eventId||seen.has(receipt.eventId))return false
   seen.add(receipt.eventId);return true
  },
  clear(){scope='';seen.clear()},
 }
}
