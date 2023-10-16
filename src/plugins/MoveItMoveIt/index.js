'use strict'
import { registerRoute } from '../../routes'

import MoveItMoveIt from './MoveItMoveIt.vue'

registerRoute(MoveItMoveIt, {
	Control: {
		MoveItMoveIt: {
			icon: 'mdi-axis-arrow',
			caption: 'Move It Move It',
			path: '/Plugins/MoveItMoveIt'
		}
	}
});
