"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const data_model_1 = require("./data-model");
const messageType = {
    privateMessage: 1
};
const chatCtrl = {
    saveMessage: (data) => {
        let msgType = 0;
        if (data.type === 'private-message') {
            msgType = messageType.privateMessage;
        }
        else {
            return Observable_1.Observable.create(observer => {
                observer.error(new Error('Unknown message type:' + data.type));
            });
        }
        return data_model_1.dataModelMessages.saveChatMessage({ type: msgType, srcUserId: data.srcUserId, destUserId: data.destUserId, message: data.message });
    }
};
exports.chatCtrl = chatCtrl;
//# sourceMappingURL=chat-controller.js.map