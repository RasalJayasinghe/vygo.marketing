import handler from '../../api/slack-ping.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export default toNetlify(handler)
