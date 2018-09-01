"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SocketIoWraper {
    constructor() {
        this.sockets = [];
    }
    push(socket) {
        this.sockets.push(socket);
    }
    remove(socket) {
        let idx = this.sockets.indexOf(socket);
        if (idx >= 0) {
            this.sockets.splice(idx, 1);
        }
    }
    getAll() {
        return this.sockets;
    }
    findByUserId(userId) {
        let res = undefined;
        for (let i = 0; i < this.sockets.length; i += 1) {
            if (this.sockets[i]['userId'] === userId) {
                res = this.sockets[i];
                break;
            }
        }
        return res;
    }
}
const socketIoWraper = new SocketIoWraper();
exports.socketIoWraper = socketIoWraper;
//# sourceMappingURL=socket-io-wraper.js.map