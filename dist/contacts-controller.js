"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_model_1 = require("./data-model");
const contactsCtrl = {
    find: (req) => {
        return data_model_1.dataModelContacts.findContacts(req.decoded.user_id, {
            type: req.body.type
        });
    },
    findUsersNotInContacts: (req) => {
        return data_model_1.dataModelContacts.findUsersNotInContacts(req.decoded.user_id, {
            login: req.body.login
        });
    },
    inviteUser: (req) => {
        return data_model_1.dataModelContacts.inviteUserToContacts(req.decoded.user_id, {
            userId: req.body.userId
        });
    },
    getNumWaitingInvitations: (req) => {
        return data_model_1.dataModelContacts.getNumWaitingInvitations(req.decoded.user_id);
    },
    deteleUser: (req) => {
        return data_model_1.dataModelContacts.deleteUserFromContacts(req.decoded.user_id, {
            contactId: req.body.contactId
        });
    },
    confirmUser: (req) => {
        return data_model_1.dataModelContacts.confirmUsersInvToContacts(req.decoded.user_id, {
            contactId: req.body.contactId
        });
    }
};
exports.contactsCtrl = contactsCtrl;
//# sourceMappingURL=contacts-controller.js.map