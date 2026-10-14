import type {CheckinModel} from '@/types/domain'
import {addLocalDays,differenceInLocalCalendarDays,parseLocalDate} from '@/utils/date'
export const planTypes={smokeFree:'连续无烟',records:'连续记录',limit:'吸烟上限',scene:'场景目标'} as const
export type PlanType=keyof typeof planTypes
export type PlanStatus='proposed'|'accepted'|'active'|'completed'|'missed'|'cancelled'|'expired'
export type PlanRole='quitter'|'supporter'
export interface Plan {id:string;type:PlanType;start:string;end:string;target:number;title:string;status:PlanStatus;version:number;proposer:PlanRole;participants:PlanRole[];confirmedDates:string[];reason:string;source:'mock'}
export const statusLabels:Record<PlanStatus,string>={proposed:'待确认',accepted:'已接受',active:'进行中',completed:'已达成 · 模拟',missed:'未达成',cancelled:'已取消',expired:'已过期'}
export function validatePlan(plan:Pick<Plan,'type'|'start'|'end'|'target'|'title'>){
 if(!Object.prototype.hasOwnProperty.call(planTypes,plan.type))throw new Error('请选择计划类型')
 parseLocalDate(plan.start);parseLocalDate(plan.end)
 const days=differenceInLocalCalendarDays(plan.end,plan.start)+1
 if(days<1||days>90)throw new Error('计划范围须为 1–90 天')
 if(!Number.isInteger(plan.target)||plan.target<1||plan.target>(plan.type==='limit'?18000:days))throw new Error('目标须为有效整数；天数不能超过计划范围')
 if(!plan.title.trim()||Array.from(plan.title).length>40)throw new Error('请填写 1–40 字目标名称')
}
export function evaluatePlan(plan:Plan,records:CheckinModel[],today:string){
 validatePlan(plan)
 const days=differenceInLocalCalendarDays(plan.end,plan.start)+1
 const byDate=new Map(records.map(row=>[row.checkinDate,row]))
 let run=0,best=0,total=0,coverage=0
 const nodes=Array.from({length:days},(_,i)=>{
  const date=addLocalDays(plan.start,i),row=date<=today?byDate.get(date):undefined
  const verified=date<=today&&(plan.type==='scene'?plan.confirmedDates.includes(date):Boolean(row)&&(plan.type!=='smokeFree'||row!.cigarettes===0))
  if(row){coverage++;total+=row.cigarettes}
  run=verified?run+1:0;best=Math.max(best,run)
  return {date,state:date>today?'future':!row&&plan.type!=='scene'?'missing':verified?'verified':'unmet'}
 })
 const progress=plan.type==='limit'?coverage:plan.type==='scene'?nodes.filter(node=>node.state==='verified').length:best
 const eligible=plan.type==='limit'?coverage===days&&today>=plan.end&&total<=plan.target:progress>=plan.target
 const ratio=plan.type==='limit'?coverage/days:Math.min(1,progress/plan.target)
 // Missing dates are pending evidence, even after deadline; they never become zero.
 const pending=nodes.some(node=>node.date<=today&&node.state==='missing')
 const outcome=eligible?'completed':today>plan.end&&!pending?'missed':'active'
 return {nodes,progress,total,coverage,days,ratio,eligible,pending,outcome:outcome as 'completed'|'missed'|'active'}
}
export function transitionPlan(plan:Plan,action:'accept'|'activate'|'verify'|'cancel'|'expire'|'confirm',role:PlanRole,records:CheckinModel[],today:string){
 const next={...plan,participants:[...plan.participants],confirmedDates:[...plan.confirmedDates]}
 if(action==='cancel'){if(role!=='quitter')throw new Error('仅戒烟者可取消');if(['completed','cancelled','expired'].includes(plan.status))throw new Error('计划已经结束');next.status='cancelled';next.reason='戒烟者取消';return next}
 if(action==='accept'){if(role!=='quitter'||plan.status!=='proposed')throw new Error('仅戒烟者可接受提案');next.status='accepted';return next}
 if(action==='expire'){if(plan.status!=='proposed'||today<=plan.end)throw new Error('仅过期的未接受提案可失效');next.status='expired';next.reason='未接受且超过截止日';return next}
 if(action==='activate'){if(role!=='quitter'||plan.status!=='accepted'||today<plan.start)throw new Error('尚不能激活计划');next.status='active';return next}
 if(role!=='quitter'||!['active','completed','missed'].includes(plan.status))throw new Error('仅戒烟者可核验自己的目标')
 if(action==='confirm'){if(plan.type!=='scene'||today<plan.start||today>plan.end)throw new Error('此日期不能自主确认');if(!next.confirmedDates.includes(today))next.confirmedDates.push(today)}
 next.status=evaluatePlan(next,records,today).outcome;next.reason=next.status==='missed'?'完整证据未满足目标':''
 return next
}
