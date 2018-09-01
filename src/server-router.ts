import * as express from 'express';

import { stringTools } from './string-tools';
import { authenticationCtrl } from './authentication-controller';
import { contactsCtrl } from './contacts-controller';
import { socketIoWraper } from './socket-io-wraper';
import { chatCtrl } from './chat-controller';

const serverRouter = express.Router();

// CORS
serverRouter.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	next();
});
/**
 * User login.
 * 
 * @param req.body.email
 * @param req.body.password
 */
serverRouter.post('/user-login', (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.email || req.body.email === '') {
			return false;
		}
		if (!req.body.password || req.body.password === '') {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		authenticationCtrl.login({
			email: req.body.email,
			password: req.body.password
		}).subscribe(value => {
			res.json({ status: 0, message: 'The user has been logged in correctly.', data: value.data });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'Invalid parameters passed to function.' });
	}
});
/**
 * New user registration.
 * 
 * @param req.body.login
 * @param req.body.email
 * @param req.body.password
 */
serverRouter.post('/user-register', (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.login || req.body.login === '') {
			return false;
		}
		if (!req.body.email || req.body.email === '') {
			return false;
		}
		if (!req.body.password || req.body.password === '') {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		authenticationCtrl.register({
			login: req.body.login,
			email: req.body.email,
			password: req.body.password
		}).subscribe(value => {
			res.json({ status: 0, message: 'A new user has been correctly registered.' });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'Invalid parameters passed to function.' });
	}
});
/**
 * Pobranie listy kontaktów.
 * 
 * @param req.body.type 'active'   - list of accepted contacts,
 *                      'send'     - list of unaccepted contacts sent by the user,
 *                      'received' - list of unaccepted contacts received by the user,
 */
serverRouter.post('/contacts-list', authenticationCtrl.authenticateRequest, (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.type || (req.body.type !== 'active' && req.body.type !== 'send' && req.body.type !== 'received')) {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		contactsCtrl.find(req).subscribe(value => {
			let data = value.data.map((element: any) => {
				return {
					contactId: element.ko_id,
					userId: element.uz_id,
					login: element.uz_login
				};
			});
			res.json({ status: 0, message: 'Contact list.', data: data });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'The invalid parameters were passed to the function.' });
	}
});
/**
 * List of users that you can invite to contacts (not yet sent
 * them invitations).
 * 
 * @param req.body.login
 */
serverRouter.post('/contacts-find-users', authenticationCtrl.authenticateRequest, (req, res) => {
	contactsCtrl.findUsersNotInContacts(req).subscribe(value => {
		let data = value.data.map((element: any) => {
			return {
				id: element.uz_id,
				login: element.uz_login
			};
		});
		res.json({ status: 0, message: 'List of users.', data: data });
	}, (error: Error) => {
		res.json({ status: (-1), message: error.message });
	});
});
/**
 * The number of invitations received for contacts pending approval.
 */
serverRouter.post('/contacts-num-waiting-invitations', authenticationCtrl.authenticateRequest, (req, res) => {
	contactsCtrl.getNumWaitingInvitations(req).subscribe(value => {
		res.json({ status: 0, message: value.message, data: value.data });
	}, (error: Error) => {
		res.json({ status: (-1), message: error.message });
	});
});
/**
 * User contact invitation.
 * 
 * @param req.body.userId
 */
serverRouter.post('/contacts-invite-users', authenticationCtrl.authenticateRequest, (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.userId || !stringTools.isValidInt(req.body.userId)) {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		contactsCtrl.inviteUser(req).subscribe(value => {
			if (value.status === 0) {
				// wysłanie powiadomienia do zaproszonego użytkownika
				socketIoWraper.getAll().forEach(socket => {
					if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
						socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
					}
				});
			}
			res.json({ status: 0, message: value.message, data: value.data });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'The invalid parameters were passed to the function.' });
	}
});
/**
 * Removing a user from contacts.
 * 
 * @param req.body.contactId
 */
serverRouter.post('/contacts-delete-users', authenticationCtrl.authenticateRequest, (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.contactId || !stringTools.isValidInt(req.body.contactId)) {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		contactsCtrl.deteleUser(req).subscribe(value => {
			if (value.status === 0) {
				// wysłanie powiadomienia do usuniętego użytkownika
				socketIoWraper.getAll().forEach(socket => {
					if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
						socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
					}
				});
				// wysłanie powiadomienia do użytkownika który usuwał
				socketIoWraper.getAll().forEach(socket => {
					if (socket['userId'] && socket['userId'] === Number(req['decoded'].uz_id)) {
						socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
					}
				});
			}
			res.json({ status: 0, message: value.message, data: value.data });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'The invalid parameters were passed to the function.' });
	}
});
/**
 * Accepting a contact invitation.
 * 
 * @param req.body.contactId
 */
serverRouter.post('/contacts-confirm-users', authenticationCtrl.authenticateRequest, (req, res) => {
	const validateParams = (req): boolean => {
		if (!req.body.contactId || !stringTools.isValidInt(req.body.contactId)) {
			return false;
		}

		return true;
	};

	if (validateParams(req)) {
		contactsCtrl.confirmUser(req).subscribe(value => {
			if (value.status === 0) {
				// wysłanie powiadomienia do użytkownika którego zaposzenie zaakceptowaliśmy
				socketIoWraper.getAll().forEach(socket => {
					if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
						socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
					}
				});
				// wysłanie powiadomienia do użytkownika który zaakceptował zaproszenie
				socketIoWraper.getAll().forEach(socket => {
					if (socket['userId'] && socket['userId'] === Number(req['decoded'].uz_id)) {
						socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
					}
				});
			}
			res.json({ status: 0, message: value.message, data: value.data });
		}, (error: Error) => {
			res.json({ status: (-1), message: error.message });
		});
	}
	else {
		res.json({ status: (-1), message: 'The invalid parameters were passed to the function.' });
	}
});

export { serverRouter }
