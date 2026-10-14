export function loginDestination(value:unknown){
 return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!value.startsWith('/login')?value:'/hub'
}
