import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const root=new URL('../',import.meta.url),template=await readFile(new URL('scripts/constellation-schema.template.sql',root),'utf8')
await mkdir(new URL('docs/migrations/',root),{recursive:true})
for(const [provider,type,caller,auth] of [['supabase','uuid','auth.uid()',"auth.uid() is not null and auth.role()='authenticated'"],['cloudbase','bigint','public.current_user_id()',"public.current_user_id() is not null and public.current_request_role()='authenticated'"]]){
 const source=template.replaceAll('__USER_TYPE__',type).replaceAll('__CALLER__',caller).replaceAll('__AUTH_CHECK__',`(${auth})`)
 const output=new URL(`docs/migrations/constellation-s4-${provider}.draft.sql`,root)
 await writeFile(output,`-- Provider: ${provider}. GENERATED REVIEW DRAFT, NOT DEPLOYED.\n${source}`)
 console.log(fileURLToPath(output))
}
