import handler from '../../api/extract-webinar.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export const handler = toNetlify(handler)
