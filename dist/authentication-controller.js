"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
const Observable_1 = require("rxjs/Observable");
const server_config_1 = require("./server-config");
const data_model_1 = require("./data-model");
const verifyToken = (token, callback) => {
    if (token) {
        jwt.verify(token, server_config_1.serverConfig.jsonwebtoken.secret, (err, decoded) => {
            if (err) {
                callback({ error: (-1), message: 'User verification error' }, undefined);
            }
            else {
                callback(undefined, decoded);
            }
        });
    }
    else {
        callback({ error: (-1), message: 'User verification error' }, undefined);
    }
};
const authenticationCtrl = {
    testOk: (data) => {
        return Observable_1.Observable.create((observer) => {
            observer.next({ error: (-2), message: 'To jest test' });
            observer.complete();
        });
    },
    testError: (data) => {
        return Observable_1.Observable.create(observer => {
            observer.error(new Error('Invalid parameters passed to function.'));
        });
    },
    authenticate: (token, callback) => {
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
    login: (data) => {
        return data_model_1.dataModelUsers.userLogin({
            email: data.email,
            password: data.password
        });
    },
    register: (data) => {
        return data_model_1.dataModelUsers.userRegister({
            login: data.login,
            email: data.email,
            password: data.password
        });
    }
};
exports.authenticationCtrl = authenticationCtrl;
//# sourceMappingURL=authentication-controller.js.map