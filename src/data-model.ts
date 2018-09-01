import * as pg from 'pg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Observable }  from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';

import { serverConfig } from './server-config';

const pool = new pg.Pool(serverConfig.database);

pool.on('error', (err, client) => {
	console.error('An error occurred while downloading the connection to the database!', err.message, err.stack)
});

const kontaktyStatusy = {
	usuniety: (-1),
	aktywny: 1,
	oczekujacy: 2
};

/**
 * Object responsible for logging in and registering new users.
 */
const dataModelUsers = {
	/**
	 * User login.
	 * 
	 * @param data.email
	 * @param data.password
	 */
	userLogin: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('SELECT * FROM uzytkownicy WHERE (LOWER(uz_email)=LOWER($1))', [data.email]).then(result => {
					let results = [];
					result.rows.forEach(row => {
						if (bcrypt.compareSync(data.password, row.uz_haslo)) {
							results.push(row);
						}
					});
					if (results.length === 1) {
						let tokenData = { uz_id: results[0].uz_id, uz_login: results[0].uz_login };
						let token = jwt.sign(tokenData, serverConfig.jsonwebtoken.secret, { expiresIn: 60 * 24 });
						client.release();
						observer.next({ status: 0, message: 'The user has been logged in correctly.', data: { token: token, login: results[0].uz_login }});
						observer.complete();
					}
					else {
						client.release();
						observer.error(new Error('Invalid e-mail address or user password.'));
					}
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 * Registering a new user.
	 * 
	 * @param data.email
	 * @param data.login
	 * @param data.password
	 */
	userRegister: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT COUNT(*) AS ile FROM uzytkownicy WHERE (LOWER(uz_email)=LOWER($1))', [data.email]).then(result => {
						if (result.rows && Number(result.rows[0].ile) === 0) {
							client.query('SELECT COUNT(*) AS ile FROM uzytkownicy WHERE (LOWER(uz_login)=LOWER($1))', [data.login]).then(result => {
								if (result.rows && Number(result.rows[0].ile) === 0) {
									let pom = new Promise((resolve, reject) => {
										bcrypt.genSalt(10, (err, salt) => {
											if (err) {
												reject(err);
											}
											else {
												bcrypt.hash(data.password, salt, (err, hash) => {
													if (err) {
														reject(err);
													}
													else {
														resolve(hash);
													}
												});
											}
										});
									}).then(hash => {
										client.query('INSERT INTO uzytkownicy (uz_haslo, uz_login, uz_email) VALUES ($1, $2, $3)', [hash, data.login, data.email]).then(result => {
											client.query('COMMIT').then(result => {
												client.release();
												observer.next({ status: 0, message: 'Poprawnie zarejestrowano nowego użytkownika.' });
												observer.complete();
											});
										});
									});
								}
								else {
									throw(new Error('The user with the given login is already registered.'));
								}
							});
						}
						else {
							throw(new Error('The user with the given e-mail address is already registered.'));
						}
					});
				}).catch(error => {
					client.query('ROLLBACK').then(result => {
						client.release();
						observer.error(error);
					});
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	}
};

/**
 * Object responsible for managing the list of contacts.
 */
const dataModelContacts = {
	/**
	 * Returns a list of users who are not on the contact list
	 * user (regardless of status).
	 * 
	 * @param uz_id {number} user ID
	 * @param data.login {string} an inscription for filtering the list of users
	 * 
	 * This is a list of people that you can invite to contacts.
	 */
	findUsersNotInContacts: (uz_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query(`
					SELECT *
					FROM uzytkownicy
					WHERE (uz_id<>$1)
						AND (LOWER(uz_login) LIKE LOWER($2))
						AND (uz_id NOT IN (
							SELECT ko_uz_id_do
							FROM kontakty
							WHERE (ko_uz_id_od=$1)
								AND (ko_ks_id<>(-1))
							GROUP BY ko_uz_id_do
						))
					ORDER BY uz_login
				`, [uz_id, `%${data.login}%`]).then(result => {
					client.release();
					observer.next({ status: 0, message: 'Lista użytkowników.', data: result.rows });
					observer.complete();
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 * Registering a contact invitation.
	 * 
	 * @param uz_id {number} user ID (user inviting to contacts)
	 * @param data.userId {nuumber} user's ID (user invited to contacts)
	 */
	inviteUserToContacts: (uz_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM kontakty WHERE (ko_uz_id_od=$1) AND (ko_uz_id_do=$2)', [uz_id, data.userId]).then(result => {
						if (result.rows.length === 0) {
							// związku jeszcze nie było - rejestracja związków w obie strony (uzytkownik1 -> użytkownik2, użytkownik2 -> użytkownik1)
							client.query('INSERT INTO kontakty (ko_uz_id_start, ko_uz_id_od, ko_uz_id_do, ko_ks_id) VALUES ($1, $2, $3, 2)', [uz_id, uz_id, data.userId]).then(result => {
								client.query('INSERT INTO kontakty (ko_uz_id_start, ko_uz_id_od, ko_uz_id_do, ko_ks_id) VALUES ($1, $2, $3, 2)', [uz_id, data.userId, uz_id]).then(result => {
									client.query('COMMIT').then(result => {
										client.release();
										observer.next({ status: 0, message: 'Poprawnie zaproszono nowego użytkownika do kontaktów.', data: { sourceUserId: uz_id, targetUserId: data.userId } });
										observer.complete();
									});
								});
							});
						}
						else {
							// związek już był - aktualizacja związków w obie strony (uzytkownik1 -> użytkownik2, użytkownik2 -> użytkownik1)
							if (Number(result.rows[0].ko_ks_id) === kontaktyStatusy.usuniety) {
								client.query('UPDATE kontakty SET ko_uz_id_start=$1, ko_ks_id=$2 WHERE (ko_uz_id_od=$3) AND (ko_uz_id_do=$4)', [uz_id, kontaktyStatusy.oczekujacy, uz_id, data.userId]).then(result => {
									client.query('UPDATE kontakty SET ko_uz_id_start=$1, ko_ks_id=$2 WHERE (ko_uz_id_od=$3) AND (ko_uz_id_do=$4)', [uz_id, kontaktyStatusy.oczekujacy, data.userId, uz_id]).then(result => {
										client.query('COMMIT').then(result => {
											client.release();
											observer.next({ status: 0, message: 'A new contact user has been successfully invited.', data: { sourceUserId: uz_id, targetUserId: data.userId } });
											observer.complete();
										});
									});
								});
							}
							else {
								client.release();
								observer.next({ status: 0, message: 'Contact is already registered.', data: { sourceUserId: uz_id, targetUserId: data.userId } });
								observer.complete();
							}
						}
					});
				}).catch(error => {
					client.query('ROLLBACK').then(result => {
						client.release();
						observer.error(error);
					});
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 * Returns the number of contacts waiting for user approval.
	 * 
	 * @param uz_id
	 * 
	 *To show the number on the contact icon.
	 */
	getNumWaitingInvitations: (uz_id: number): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('SELECT COUNT(*) AS ile FROM kontakty WHERE (ko_uz_id_start<>$1) AND (ko_uz_id_od=$1) AND (ko_ks_id=$2)', [uz_id, kontaktyStatusy.oczekujacy]).then(result => {
					client.release();
					observer.next({ status: 0, message: 'Poprawnie pobrano liczbę oczekujących zaproszeń do kontaktów.', data: result.rows[0].ile });
					observer.complete();
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 * Returns the list of contacts.
	 * 
	 * @param data.type {string} list type (active, send, received)
	 */
	findContacts: (uz_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				if (data.type === 'active') {
					client.query('SELECT * FROM kontakty JOIN uzytkownicy ON (ko_uz_id_do=uz_id) WHERE (ko_uz_id_od=$1) AND (ko_ks_id=$2) ORDER BY uz_login', [uz_id, kontaktyStatusy.aktywny]).then(result => {
						client.release();
						observer.next({ status: 0, message: 'contact list.', data: result.rows });
						observer.complete();
					});
				}
				else if (data.type === 'send') {
					client.query('SELECT * FROM kontakty JOIN uzytkownicy ON (ko_uz_id_do=uz_id) WHERE (ko_uz_id_start=$1) AND (ko_uz_id_od=$1) AND (ko_ks_id=$2) ORDER BY uz_login', [uz_id, kontaktyStatusy.oczekujacy]).then(result => {
						client.release();
						observer.next({ status: 0, message: 'contact list.', data: result.rows });
						observer.complete();
					});
				}
				else if (data.type === 'received') {
					client.query('SELECT * FROM kontakty JOIN uzytkownicy ON (ko_uz_id_do=uz_id) WHERE (ko_uz_id_start<>$1) AND (ko_uz_id_od=$1) AND (ko_ks_id=$2) ORDER BY uz_login', [uz_id, kontaktyStatusy.oczekujacy]).then(result => {
						client.release();
						observer.next({ status: 0, message: 'contact list.', data: result.rows });
						observer.complete();
					});
				}
				else {
					observer.error(new Error('Invalid list type.'));
				}
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 *Delete contact.
	 * 
	 * @param uz_id
	 * @param data.contactId
	 */
	deleteUserFromContacts: (uz_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM kontakty WHERE (ko_id=$1)', [data.contactId]).then(result => {
						if (result.rows.length === 1 && Number(result.rows[0].ko_uz_id_od) === uz_id && Number(result.rows[0].ko_ks_id) !== kontaktyStatusy.usuniety) {
							let firstContact = result.rows[0];
							client.query('SELECT * FROM kontakty WHERE (ko_uz_id_od=$1) AND (ko_uz_id_do=$2)', [firstContact.ko_uz_id_do, firstContact.ko_uz_id_od]).then(result => {
								if (result.rows.length === 1 && Number(result.rows[0].ko_ks_id) !== kontaktyStatusy.usuniety) {
									let secondContact = result.rows[0];
									client.query('UPDATE kontakty SET ko_ks_id=$1 WHERE (ko_id=$2)', [kontaktyStatusy.usuniety, firstContact.ko_id]).then(result => {
										client.query('UPDATE kontakty SET ko_ks_id=$1 WHERE (ko_id=$2)', [kontaktyStatusy.usuniety, secondContact.ko_id]).then(result => {
											client.query('COMMIT').then(result => {
												client.release();
												observer.next({ status: 0, message: 'The contact has been deleted correctly.', data: {} });
												observer.complete();
											});
										});
									});
								}
								else {
									throw(new Error('Invalid contact ID (2).'));
								}
							});
						}
						else {
							throw(new Error('Invalid contact ID (1).'));
						}
					});
				}).catch(error => {
					client.query('ROLLBACK').then(result => {
						client.release();
						observer.error(error);
					});
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},
	/**
	 * Confirm contact.
	 * 
	 * @param uz_id
	 * @param data.contactId
	 */
	confirmUsersInvToContacts: (uz_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM kontakty WHERE (ko_id=$1)', [data.contactId]).then(result => {
						if (result.rows.length === 1 && Number(result.rows[0].ko_uz_id_od) === uz_id && Number(result.rows[0].ko_ks_id) === kontaktyStatusy.oczekujacy) {
							let firstContact = result.rows[0];
							client.query('SELECT * FROM kontakty WHERE (ko_uz_id_od=$1) AND (ko_uz_id_do=$2)', [firstContact.ko_uz_id_do, firstContact.ko_uz_id_od]).then(result => {
								if (result.rows.length === 1 && Number(result.rows[0].ko_ks_id) === kontaktyStatusy.oczekujacy) {
									let secondContact = result.rows[0];
									client.query('UPDATE kontakty SET ko_ks_id=$1 WHERE (ko_id=$2)', [kontaktyStatusy.aktywny, firstContact.ko_id]).then(result => {
										client.query('UPDATE kontakty SET ko_ks_id=$1 WHERE (ko_id=$2)', [kontaktyStatusy.aktywny, secondContact.ko_id]).then(result => {
											client.query('COMMIT').then(result => {
												client.release();
												observer.next({ status: 0, message: 'Contact was correctly accepted.', data: {} });
												observer.complete();
											});
										});
									});
								}
								else {
									throw(new Error('Invalid contact ID (2).'));
								}
							});
						}
						else {
							throw(new Error('Invalid contact ID (1).'));
						}
					});
				}).catch(error => {
					client.query('ROLLBACK').then(result => {
						client.release();
						observer.error(error);
					});
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	}
};

/**
 * The object responsible for registering and loading messages.
 */
const dataModelMessages = {
	/**
	 * Save the message.
	 * 
	 * @param data.type
	 * @param data.srcUserId
	 * @param data.destUserId
	 * @param data.message
	 */
	saveChatMessage: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('INSERT INTO wiadomosci (wi_wt_id, wi_uz_id_od, wi_uz_id_do, wi_tresc) VALUES ($1, $2, $3, $4)', [data.type, data.srcUserId, data.destUserId, data.message]).then(result => {
						client.query(`SELECT currval(pg_get_serial_sequence('wiadomosci', 'wi_id')) AS id`).then(result => {
							client.query('SELECT * FROM wiadomosci WHERE (wi_id=$1)', [result.rows[0].id]).then(result => {
								if (result.rows.length === 1) {
									let wiadomosc: any = result.rows[0];
									return client.query('COMMIT').then(result => {
										client.release();
										observer.next({ status: 0, message: 'A message has been saved.', data: wiadomosc });
										observer.complete();
									});
								}
								else {
									throw(new Error('Error when saving messages.'));
								}
							});
						});
					});
				}).catch(error => {
					client.query('ROLLBACK').then(result => {
						client.release();
						observer.error(error);
					});
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	}
};

export { dataModelUsers, dataModelContacts, dataModelMessages }
