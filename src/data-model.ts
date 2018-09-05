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

const contactsStatus = {
	detached: (-1),
	active: 1,
	expectant: 2
};

/**
 * Object responsible for logging in and registering new users.
 */
const dataModelUsers = {
	/**
	 * Get All Messages
	 * 
	 * @param data.src_userId
	 * @param data.dest_userId
	 */
	getAllMessages: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				let results = [];
				let first_username = '';
				let second_username = '';
				let stmt;
				client.query('SELECT * FROM users WHERE  user_id = 6').then(result => {
					result.rows.forEach(row => {
						first_username = row.user_login
						console.log(first_username);
					});		
				});
				client.query('SELECT * FROM users WHERE  user_id = 5').then(result => {
					result.rows.forEach(row => {
						second_username = row.user_login
						console.log(second_username);
					});		
				});
				client.query('SELECT * FROM messages WHERE m_user_id_one = 6  AND m_user_id_two = 5;').then(result => {
							result.rows.forEach(row => {
								if (row.m_user_id_one == 6 ) {
									stmt = { type: 'private-message', time: row.m_data, login: first_username, text: row.m_content }
								}
								else if (row.m_user_id_one == 7 ) {
									stmt = { type: 'private-message', time: row.m_data, login: second_username, text: row.m_content }
								}
						    console.log(stmt);
						    console.log(row);
							results.push(stmt);
					});
					if (results.length > 1) {
						console.log(results.length);
						console.log(results);
						client.release();
						observer.next({ status: 0, message: 'Messages Found.', data: { result: results }});
						observer.complete();
					}
					else {
						client.release();
						observer.error(new Error('No messages'));
					}
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},	
	/**
	 * Save db Messages
	 * 
	 * @param data.src_userId
	 * @param data.dest_userId
	 */
	saveDbMessages: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				let results = [];
				client.query('INSERT INTO db_messages (type, time, login, text) VALUES ($1, $2, $3, 2)', [data.type, data.time, data.login, data.text]).then(result => {
					if (result) {
						console.log(results.length);
						console.log(results);
						client.release();
						console.log('Success');
						observer.next({ status: 0, message: 'Messages Saved!.'});
						observer.complete();
					}
					else {
						client.release();
						console.log('error');
						observer.error(new Error('No messages'));
					}
				});
			}).catch(error => {
				observer.error(error);
			});
		});
	},		
	/**
	 * User login.
	 * 
	 * @param data.email
	 * @param data.password
	 */
	userLogin: (data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('SELECT * FROM users WHERE (LOWER(user_email)=LOWER($1))', [data.email]).then(result => {
					let results = [];
					result.rows.forEach(row => {
						if (bcrypt.compareSync(data.password, row.user_password)) {
							results.push(row);
						}
					});
					if (results.length === 1) {
						let tokenData = { user_id: results[0].user_id, user_login: results[0].user_login };
						let token = jwt.sign(tokenData, serverConfig.jsonwebtoken.secret, { expiresIn: 60 * 24 });
						client.release();
						observer.next({ status: 0, message: 'The user has been logged in correctly.', data: { token: token, login: results[0].user_login }});
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
					client.query('SELECT COUNT(*) AS ile FROM users WHERE (LOWER(user_email)=LOWER($1))', [data.email]).then(result => {
						if (result.rows && Number(result.rows[0].ile) === 0) {
							client.query('SELECT COUNT(*) AS ile FROM users WHERE (LOWER(user_login)=LOWER($1))', [data.login]).then(result => {
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
										client.query('INSERT INTO users(user_password, user_login, user_email) VALUES ($1, $2, $3)', [hash, data.login, data.email]).then(result => {
											client.query('COMMIT').then(result => {
												client.release();
												observer.next({ status: 0, message: 'A new user has been registered correctly.' });
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
	 * @param user_id {number} user ID
	 * @param data.login {string} an inscription for filtering the list of users
	 * 
	 * This is a list of people that you can invite to contacts.
	 */
	findUsersNotInContacts: (user_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query(`
					SELECT *
					FROM users
					WHERE (user_id<>$1)
						AND (LOWER(user_login) LIKE LOWER($2))
						AND (user_id NOT IN (
							SELECT co_user_id_two
							FROM contacts
							WHERE (co_user_id_one=$1)
								AND (co_cs_id<>(-1))
							GROUP BY co_user_id_two
						))
					ORDER BY user_login
				`, [user_id, `%${data.login}%`]).then(result => {
					client.release();
					observer.next({ status: 0, message: 'List of users.', data: result.rows });
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
	 * @param user_id {number} user ID (user inviting to contacts)
	 * @param data.userId {nuumber} user's ID (user invited to contacts)
	 */
	inviteUserToContacts: (user_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM contacts WHERE (co_user_id_one=$1) AND (co_user_id_two=$2)', [user_id, data.userId]).then(result => {
						if (result.rows.length === 0) {
							//the relationship has not been there - registration of compounds in both directions (user1 -> user2, user2 -> user1)
							client.query('INSERT INTO contacts (co_user_id_start, co_user_id_one, co_user_id_two, co_cs_id) VALUES ($1, $2, $3, 2)', [user_id, user_id, data.userId]).then(result => {
								client.query('INSERT INTO contacts (co_user_id_start, co_user_id_one, co_user_id_two, co_cs_id) VALUES ($1, $2, $3, 2)', [user_id, data.userId, user_id]).then(result => {
									client.query('COMMIT').then(result => {
										client.release();
										observer.next({ status: 0, message: 'A new contact user has been successfully invited.', data: { sourceUserId: user_id, targetUserId: data.userId } });
										observer.complete();
									});
								});
							});
						}
						else {
							// the relationship was updated ,connections in both directions (user1 -> user2, user2 -> user1)
							if (Number(result.rows[0].co_cs_id) === contactsStatus.detached) {
								client.query('UPDATE contacts SET co_user_id_start=$1, co_cs_id=$2 WHERE (co_user_id_one=$3) AND (co_user_id_two=$4)', [user_id, contactsStatus.expectant, user_id, data.userId]).then(result => {
									client.query('UPDATE contacts SET co_user_id_start=$1, co_cs_id=$2 WHERE (co_user_id_one=$3) AND (co_user_id_two=$4)', [user_id, contactsStatus.expectant, data.userId, user_id]).then(result => {
										client.query('COMMIT').then(result => {
											client.release();
											observer.next({ status: 0, message: 'A new contact user has been successfully invited.', data: { sourceUserId: user_id, targetUserId: data.userId } });
											observer.complete();
										});
									});
								});
							}
							else {
								client.release();
								observer.next({ status: 0, message: 'Contact is already registered.', data: { sourceUserId: user_id, targetUserId: data.userId } });
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
	 * @param user_id
	 * 
	 *To show the number on the contact icon.
	 */
	getNumWaitingInvitations: (user_id: number): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('SELECT COUNT(*) AS ile FROM contacts WHERE (co_user_id_start<>$1) AND (co_user_id_one=$1) AND (co_cs_id=$2)', [user_id, contactsStatus.expectant]).then(result => {
					client.release();
					observer.next({ status: 0, message: 'The number of pending contact invitations was retrieved correctly.', data: result.rows[0].ile });
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
	findContacts: (user_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				if (data.type === 'active') {
					client.query('SELECT * FROM contacts JOIN users ON (co_user_id_two=user_id) WHERE (co_user_id_one=$1) AND (co_cs_id=$2) ORDER BY user_login', [user_id, contactsStatus.active]).then(result => {
						client.release();
						observer.next({ status: 0, message: 'contact list.', data: result.rows });
						observer.complete();
					});
				}
				else if (data.type === 'send') {
					client.query('SELECT * FROM contacts JOIN users ON (co_user_id_two=user_id) WHERE (co_user_id_start=$1) AND (co_user_id_one=$1) AND (co_cs_id=$2) ORDER BY user_login', [user_id, contactsStatus.expectant]).then(result => {
						client.release();
						observer.next({ status: 0, message: 'contact list.', data: result.rows });
						observer.complete();
					});
				}
				else if (data.type === 'received') {
					client.query('SELECT * FROM contacts JOIN users ON (co_user_id_two=user_id) WHERE (co_user_id_start<>$1) AND (co_user_id_one=$1) AND (co_cs_id=$2) ORDER BY user_login', [user_id, contactsStatus.expectant]).then(result => {
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
	 * @param user_id
	 * @param data.contactId
	 */
	deleteUserFromContacts: (user_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM contacts WHERE (co_id=$1)', [data.contactId]).then(result => {
						if (result.rows.length === 1 && Number(result.rows[0].co_user_id_one) === user_id && Number(result.rows[0].co_cs_id) !== contactsStatus.detached) {
							let firstContact = result.rows[0];
							client.query('SELECT * FROM contacts WHERE (co_user_id_one=$1) AND (co_user_id_two=$2)', [firstContact.co_user_id_two, firstContact.co_user_id_one]).then(result => {
								if (result.rows.length === 1 && Number(result.rows[0].co_cs_id) !== contactsStatus.detached) {
									let secondContact = result.rows[0];
									client.query('UPDATE contacts SET co_cs_id=$1 WHERE (co_id=$2)', [contactsStatus.detached, firstContact.co_id]).then(result => {
										client.query('UPDATE contacts SET co_cs_id=$1 WHERE (co_id=$2)', [contactsStatus.detached, secondContact.co_id]).then(result => {
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
	 * @param user_id
	 * @param data.contactId
	 */
	confirmUsersInvToContacts: (user_id: number, data: any): Observable<any> => {
		return Observable.create((observer: Subscriber<any>) => {
			pool.connect().then(client => {
				client.query('BEGIN').then(result => {
					client.query('SELECT * FROM contacts WHERE (co_id=$1)', [data.contactId]).then(result => {
						if (result.rows.length === 1 && Number(result.rows[0].co_user_id_one) === user_id && Number(result.rows[0].co_cs_id) === contactsStatus.expectant) {
							let firstContact = result.rows[0];
							client.query('SELECT * FROM contacts WHERE (co_user_id_one=$1) AND (co_user_id_two=$2)', [firstContact.co_user_id_two, firstContact.co_user_id_one]).then(result => {
								if (result.rows.length === 1 && Number(result.rows[0].co_cs_id) === contactsStatus.expectant) {
									let secondContact = result.rows[0];
									client.query('UPDATE contacts SET co_cs_id=$1 WHERE (co_id=$2)', [contactsStatus.active, firstContact.co_id]).then(result => {
										client.query('UPDATE contacts SET co_cs_id=$1 WHERE (co_id=$2)', [contactsStatus.active, secondContact.co_id]).then(result => {
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
					client.query('INSERT INTO messages (m_mt_id, m_user_id_one, m_user_id_two, m_content) VALUES ($1, $2, $3, $4)', [data.type, data.srcUserId, data.destUserId, data.message]).then(result => {
						client.query(`SELECT currval(pg_get_serial_sequence('messages', 'm_id')) AS id`).then(result => {
							client.query('SELECT * FROM messages WHERE (m_id=$1)', [result.rows[0].id]).then(result => {
								if (result.rows.length === 1) {
									let message: any = result.rows[0];
									return client.query('COMMIT').then(result => {
										client.release();
										observer.next({ status: 0, message: 'A message has been saved.', data: message });
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
