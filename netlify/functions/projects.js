import handler from '../../api/projects.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export default toNetlify(handler)
