import type {DailyMood} from '@/utils/dailyPulse'
export interface CoreState {cigarettes:number|null;score:number|null;mood:DailyMood|null}
const palettes={relaxed:['#ace9da','#ebd4a4'],calm:['#b6d7ed','#e7ddb9'],anxious:['#b8a7e7','#d8c7ef'],irritable:['#edae8b','#e1bd83'],tired:['#93a6cf','#bec8dd'],fulfilled:['#f1cd86','#f4e7bc']} as const
export function coreAppearance(state?:CoreState){
 const smoke=Math.sqrt(Math.max(0,Math.min(200,state?.cigarettes??0))/40),tension=Math.max(0,Math.min(10,state?.score??0))/10,mood=state?.mood??'calm'
 const [color,secondary]=palettes[mood]
 return {color,secondary,fragments:state?.cigarettes==null?0:Math.min(84,Math.ceil(smoke*50)),tension,
  speed:(mood==='tired'?.22:mood==='anxious'?1.3:mood==='irritable'?1.05:.55)*(1+tension),
  distortion:mood==='anxious'?.14:mood==='irritable'?.22:mood==='tired'?.025:.045,
  breath:mood==='tired'?.018:mood==='fulfilled'?.065:.04}
}
