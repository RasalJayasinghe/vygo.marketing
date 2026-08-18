import handler from '../../api/zoom-create.js'
import { toNetlify } from '../../api/netlifyAdapter.js'

export default toNetlify(handler)
