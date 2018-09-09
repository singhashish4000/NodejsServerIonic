"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const string_tools_1 = require("./string-tools");
const authentication_controller_1 = require("./authentication-controller");
const contacts_controller_1 = require("./contacts-controller");
const socket_io_wraper_1 = require("./socket-io-wraper");
const serverRouter = express.Router();
exports.serverRouter = serverRouter;
// CORS
serverRouter.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Access-Token');
    next();
});
/**
 * User login.
 *
 * @param req.body.email
 * @param req.body.password
 */
serverRouter.post('/user-login', (req, res) => {
    const validateParams = (req) => {
        if (!req.body.email || req.body.email === '') {
            return false;
        }
        if (!req.body.password || req.body.password === '') {
            return false;
        }
        return true;
    };
    if (validateParams(req)) {
        authentication_controller_1.authenticationCtrl.login({
            email: req.body.email,
            password: req.body.password
        }).subscribe(value => {
            res.json({ status: 0, message: 'The user has been logged in correctly.', data: value.data });
        }, (error) => {
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
    const validateParams = (req) => {
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
        authentication_controller_1.authenticationCtrl.register({
            login: req.body.login,
            email: req.body.email,
            password: req.body.password
        }).subscribe(value => {
            res.json({ status: 0, message: 'A new user has been correctly registered.' });
        }, (error) => {
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
serverRouter.post('/contacts-list', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    const validateParams = (req) => {
        if (!req.body.type || (req.body.type !== 'active' && req.body.type !== 'send' && req.body.type !== 'received')) {
            return false;
        }
        return true;
    };
    if (validateParams(req)) {
        contacts_controller_1.contactsCtrl.find(req).subscribe(value => {
            let data = value.data.map((element) => {
                return {
                    contactId: element.co_id,
                    userId: element.user_id,
                    login: element.user_login
                };
            });
            res.json({ status: 0, message: 'Contact list.', data: data });
        }, (error) => {
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
serverRouter.post('/contacts-find-users', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    contacts_controller_1.contactsCtrl.findUsersNotInContacts(req).subscribe(value => {
        let data = value.data.map((element) => {
            return {
                id: element.user_id,
                login: element.user_login
            };
        });
        res.json({ status: 0, message: 'List of users.', data: data });
    }, (error) => {
        res.json({ status: (-1), message: error.message });
    });
});
/**
 * The number of invitations received for contacts pending approval.
 */
serverRouter.post('/contacts-num-waiting-invitations', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    contacts_controller_1.contactsCtrl.getNumWaitingInvitations(req).subscribe(value => {
        res.json({ status: 0, message: value.message, data: value.data });
    }, (error) => {
        res.json({ status: (-1), message: error.message });
    });
});
/**
 * User contact invitation.
 *
 * @param req.body.userId
 */
serverRouter.post('/contacts-invite-users', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    const validateParams = (req) => {
        if (!req.body.userId || !string_tools_1.stringTools.isValidInt(req.body.userId)) {
            return false;
        }
        return true;
    };
    if (validateParams(req)) {
        contacts_controller_1.contactsCtrl.inviteUser(req).subscribe(value => {
            if (value.status === 0) {
                // sending a notification to the invited user
                socket_io_wraper_1.socketIoWraper.getAll().forEach(socket => {
                    if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
                        socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
                    }
                });
            }
            res.json({ status: 0, message: value.message, data: value.data });
        }, (error) => {
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
serverRouter.post('/contacts-delete-users', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    const validateParams = (req) => {
        if (!req.body.contactId || !string_tools_1.stringTools.isValidInt(req.body.contactId)) {
            return false;
        }
        return true;
    };
    if (validateParams(req)) {
        contacts_controller_1.contactsCtrl.deteleUser(req).subscribe(value => {
            if (value.status === 0) {
                // wysłanie powiadomienia do usuniętego użytkownika
                socket_io_wraper_1.socketIoWraper.getAll().forEach(socket => {
                    if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
                        socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
                    }
                });
                // wysłanie powiadomienia do użytkownika który usuwał
                socket_io_wraper_1.socketIoWraper.getAll().forEach(socket => {
                    if (socket['userId'] && socket['userId'] === Number(req['decoded'].user_id)) {
                        socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
                    }
                });
            }
            res.json({ status: 0, message: value.message, data: value.data });
        }, (error) => {
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
serverRouter.post('/contacts-confirm-users', authentication_controller_1.authenticationCtrl.authenticateRequest, (req, res) => {
    const validateParams = (req) => {
        if (!req.body.contactId || !string_tools_1.stringTools.isValidInt(req.body.contactId)) {
            return false;
        }
        return true;
    };
    if (validateParams(req)) {
        contacts_controller_1.contactsCtrl.confirmUser(req).subscribe(value => {
            if (value.status === 0) {
                // sending a notification to the user whose request we have accepted
                socket_io_wraper_1.socketIoWraper.getAll().forEach(socket => {
                    if (socket['userId'] && socket['userId'] === Number(req.body.userId)) {
                        socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
                    }
                });
                // sending a notification to the user who accepted the invitation
                socket_io_wraper_1.socketIoWraper.getAll().forEach(socket => {
                    if (socket['userId'] && socket['userId'] === Number(req['decoded'].user_id)) {
                        socket.emit('contact-invite', { type: 'contact-invite', time: new Date() });
                    }
                });
            }
            res.json({ status: 0, message: value.message, data: value.data });
        }, (error) => {
            res.json({ status: (-1), message: error.message });
        });
    }
    else {
        res.json({ status: (-1), message: 'The invalid parameters were passed to the function.' });
    }
});
//# sourceMappingURL=server-router.js.map