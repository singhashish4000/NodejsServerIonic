import { Observable } from 'rxjs/Observable';

import { dataModelMessages } from './data-model';
import { stringTools } from './string-tools';

const messageType = {
	privateMessage: 1
};

const chatCtrl = {
	saveMessage: (data): Observable<any> => {
		let msgType: number = 0;
		if (data.type === 'private-message') {
			msgType = messageType.privateMessage;
		}
		else {
			return Observable.create(observer => {
				observer.error(new Error('Unknown message type:' + data.type));
			});
		}

		return dataModelMessages.saveChatMessage({ type: msgType, srcUserId: data.srcUserId, destUserId: data.destUserId, message: data.message });
	}
};

export { chatCtrl }
