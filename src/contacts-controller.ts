import { Observable } from 'rxjs/Observable';

import { dataModelContacts } from './data-model';
import { stringTools } from './string-tools';

const contactsCtrl = {
	find: (req): Observable<any> => {
		return dataModelContacts.findContacts(req.decoded.user_id, {
			type: req.body.type
		});
	},
	findUsersNotInContacts: (req): Observable<any> => {
		return dataModelContacts.findUsersNotInContacts(req.decoded.user_id, {
			login: req.body.login
		});
	},
	inviteUser: (req): Observable<any> => {
		return dataModelContacts.inviteUserToContacts(req.decoded.user_id, {
			userId: req.body.userId
		});
	},
	getNumWaitingInvitations: (req): Observable<any> => {
		return dataModelContacts.getNumWaitingInvitations(req.decoded.user_id);
	},
	deteleUser: (req): Observable<any> => {
		return dataModelContacts.deleteUserFromContacts(req.decoded.user_id, {
			contactId: req.body.contactId
		});
	},
	confirmUser: (req): Observable<any> => {
		return dataModelContacts.confirmUsersInvToContacts(req.decoded.user_id, {
			contactId: req.body.contactId
		});
	}
};

export { contactsCtrl }
