import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const root=new URL('../',import.meta.url)
export async function constellationMigration(provider){
 if(!['cloudbase','supabase'].includes(provider))throw new Error('Unsupported migration provider')
 const config=provider==='cloudbase'?['bigint','public.current_user_id()',"public.current_user_id() is not null and public.current_request_role()='authenticated'"]:['uuid','auth.uid()',"auth.uid() is not null and auth.role()='authenticated'"]
 const schema=await readFile(new URL('scripts/constellation-schema.template.sql',root),'utf8'),rpc=await readFile(new URL('scripts/constellation-rpc.template.sql',root),'utf8')
 let source=schema.replace('begin;',()=>`begin;\ndo $$ begin if current_setting('nico.s4_deployment_approved',true) is distinct from 'v1' then raise exception 'Deployment requires explicit approval for this database';end if;end $$;\nset local nico.s4_contract_approved='v1';`).replace(/commit;\s*$/,()=>rpc+'\ncommit;')
 source=source.replaceAll('__USER_TYPE__',config[0]).replaceAll('__CALLER__',config[1]).replaceAll('__AUTH_CHECK__',`(${config[2]})`).replaceAll('__PROVIDER__',provider)
 source=source.replace('-- S4 REVIEW DRAFT: schema/read policies only. Server RPC implementation is a separate\n-- reviewed step. Do not run against production; never enable capabilities from this draft.', '-- S4 contract approved. Complete additive schema + RPC migration.\n-- Database deployment approval is still separate; not applied to production.')
 source=source.replace('-- No write grants, no mutation RPCs, no capability RPC, no deployment activation.', '-- No raw table grants. Authenticated exported RPCs are installed below.')
 return source
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 await mkdir(new URL('docs/migrations/',root),{recursive:true})
 for(const provider of ['cloudbase','supabase']){const output=new URL(`docs/migrations/constellation-s4-${provider}.migration.sql`,root);await writeFile(output,`-- Complete S4 additive migration. NOT applied to production.\n${await constellationMigration(provider)}`);console.log(fileURLToPath(output))}
}
