"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serverConfig = {
    httpServer: {
        port: process.env.PORT || 3000
    },
    database: {
        host: 'localhost',
        port: 5432,
        database: 'chat-app',
        user: 'postgres',
        password: 'postgres',
        max: 10,
        idleTimeoutMillis: 30000
    },
    jsonwebtoken: {
        secret: 'ty4387th4387th'
    }
};
exports.serverConfig = serverConfig;
//# sourceMappingURL=server-config.js.map