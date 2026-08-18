import handler from '../../api/cron-followup.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export const handler = toNetlify(handler)
