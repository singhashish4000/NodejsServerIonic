import * as jwt from 'jsonwebtoken';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';

import { serverConfig } from './server-config';
import { dataModelUsers } from './data-model';

const verifyToken = (token: string, callback): void => {
	if (token) {
		jwt.verify(token, serverConfig.jsonwebtoken.secret, (err, decoded) => {
			if (err) {
				callback({ error: (-1), message: 'User verification error'}, undefined);
			}
			else {
				callback(undefined, decoded);
			}
		});
	}
	else {
		callback({ error: (-1), message: 'User verification error'}, undefined);
	}
};

const authenticationCtrl = {
	testOk: (data): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			observer.next({ error: (-2), message: 'To jest test' });
			observer.complete();
		});
	},
	testError: (data): Observable<any> => {
		return Observable.create(observer => {
			observer.error(new Error('Invalid parameters passed to function.'));
		});
	},
	authenticate: (token: string, callback): void => {
		verifyToken(token, callback);
	},
	authenticateRequest: (req, res, next) => {
		var token = req.headers['x-access-token'] || req.body.token || req.query.token;

		verifyToken(token, (err, value) => {
			if (err) {
				return res.json({ status: (-1), message: 'Invalid verification of request' });
			}
			else {
				req.decoded = value;
				next();
			}
		});
	},
	login: (data: any): Observable<any> => {
		return dataModelUsers.userLogin({
			email: data.email,
			password: data.password
		});
	},
	register: (data: any): Observable<any> => {
		return dataModelUsers.userRegister({
			login: data.login,
			email: data.email,
			password: data.password
		});
	},
	getAllMessages: (data: any): Observable<any> => {
		return dataModelUsers.getAllMessages({
			 data: data,
		});
	},
	saveDbMessages: (data: any): Observable<any> => {
		return dataModelUsers.saveDbMessages({
			data: data
		});
	}
};

export { authenticationCtrl }
