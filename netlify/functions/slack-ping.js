import handler from '../../api/slack-ping.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export const handler = toNetlify(handler)
