import type {CheckinFormValues,CheckinModel} from '@/types/domain'
import type {PlanRole} from '../domain/plans'
export interface CheckinBridge {mode:'mock'|'real';role:()=>PlanRole;account:()=>string|null;save:(values:CheckinFormValues)=>Promise<CheckinModel>}
/** Result-authoritative bridge: no animation before the existing repository confirms. */
export async function submitConstellationCheckin(bridge:CheckinBridge,values:CheckinFormValues){
 const account=bridge.account()
 if(bridge.role()!=='quitter')throw new Error('支持者不能代打卡')
 if(bridge.mode==='real'&&!account)throw new Error('请先登录')
 const record=await bridge.save(values)
 if(bridge.account()!==account||bridge.role()!=='quitter')throw new Error('账号或角色已切换，请重新读取')
 return {record,source:bridge.mode,feedback:'record' as const}
}
