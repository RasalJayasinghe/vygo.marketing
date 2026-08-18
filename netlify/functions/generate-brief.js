import handler from '../../api/generate-brief.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export const handler = toNetlify(handler)
