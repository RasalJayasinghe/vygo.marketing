import handler from '../../api/cron-followup.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export default toNetlify(handler)
