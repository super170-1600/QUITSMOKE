export type IdentityRole='quitter'|'supporter'|null
export type IdentitySection='personal'|'smoking'|'family'|'privacy'|'display'|'security'
export interface IdentityModel {nickname:string;role:IdentityRole;joinedAt?:string;accountLabel:string}
export const identitySections=[
 {id:'personal',label:'个人资料',code:'IDENTITY',icon:'identity'},
 {id:'smoking',label:'戒烟设置',code:'QUIT PLAN',icon:'leaf'},
 {id:'family',label:'家庭关系',code:'CONNECTION',icon:'links'},
 {id:'privacy',label:'隐私与共享',code:'PRIVACY',icon:'shield'},
 {id:'display',label:'显示与动画',code:'DISPLAY',icon:'spark'},
 {id:'security',label:'账户安全',code:'SECURITY',icon:'lock'},
] as const
