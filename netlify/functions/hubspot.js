import handler from '../../api/hubspot.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export const handler = toNetlify(handler)
