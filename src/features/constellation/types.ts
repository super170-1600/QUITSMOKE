export const layers=['core','orbitA','orbitB','planArc','photons','relics'] as const
export type Layer=typeof layers[number]
export interface StudyOptions {traces?:import('./domain/interactionTraces').InteractionTrace[];members:0|1|2;supporters?:{id:string;label:string}[];scheme:'A'|'B';atmosphere:'light'|'dark';motion:boolean;view:'front'|'side';density:number;coreState?:import('./domain/coreAppearance').CoreState;layers:Record<Layer,boolean>;plan?:{nodes:string[];type:string;status:string}}
export interface StudyTarget {id:string;x:number;y:number;label:string}
export interface StudyReport {calls:number;triangles:number;geometries:number;textures:number;renderMs:number;assetBytes:number;supporterCount:number;orbitCount:number;scheme:string;atmosphere:string;frames:number;animated:boolean;effect:import('./config/effects').EffectState;feedback?:{active:boolean;kind:string;progress:number}}
