export const effects=[
 {id:'glow',label:'微光',duration:2.4},
 {id:'starlight',label:'星雨',duration:2.7},
 {id:'resonance',label:'共振',duration:2.1},
 {id:'bloom',label:'绽放',duration:3.2},
 {id:'halo',label:'星环',duration:2.8},
] as const
export type EffectId=typeof effects[number]['id']
export interface EffectState {id:EffectId|null;progress:number;status:'idle'|'playing'|'paused'|'completed'|'cancelled'|'reduced'}
export const isEffectId=(value:unknown):value is EffectId=>effects.some(effect=>effect.id===value)
