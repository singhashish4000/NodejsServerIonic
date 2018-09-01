import * as path from 'path';

const serverConfig = {
	httpServer: {
		port: process.env.PORT || 3000
	},
	database: {
		host: 'https://node-server-for-ionic.herokuapp.com' || 'localhost',
		port: process.env.PORT,
		database: 'chat-app',
		// user: 'postgres',
		// password: 'postgres',
		max: 10, // maksymalna liczba połączeń do bazy danych
		idleTimeoutMillis: 30000
	},
	jsonwebtoken: {
		secret: 'ty4387th4387th'
	}
};

export { serverConfig }
