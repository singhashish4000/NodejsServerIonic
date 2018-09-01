"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serverConfig = {
	httpServer: {
		port: process.env.PORT || 3000
	},
	database: {
		host: 'https://node-server-for-ionic.herokuapp.com' || 'localhost',
		port: 5432,
		database: 'chat-app',
		user: 'uviomwpzyxedbg',
		password: '1ef62dfbd85c24c8e84c47b3cb5eae2e81c910b683a5fe7932feabd4c5e502fd',
		max: 10, // maksymalna liczba połączeń do bazy danych
		idleTimeoutMillis: 30000
	},
    jsonwebtoken: {
        secret: 'ty4387th4387th'
    }
};
exports.serverConfig = serverConfig;
//# sourceMappingURL=server-config.js.map