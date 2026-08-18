import handler from '../../api/extract-webinar.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export default toNetlify(handler)
