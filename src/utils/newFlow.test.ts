import {describe,it,expect} from 'vitest'
import {loginDestination} from './newFlow'
describe('new login destination',()=>{
 it('defaults to the crystal and rejects external redirects',()=>{for(const value of [null,undefined,'https://example.test','//example.test','/\\example.test','/login'])expect(loginDestination(value)).toBe('/hub')})
 it('preserves authenticated module deep links',()=>{expect(loginDestination('/trend?domain=craving')).toBe('/trend?domain=craving');expect(loginDestination('/profile')).toBe('/profile')})
})
