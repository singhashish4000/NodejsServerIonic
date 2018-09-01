import * as path from 'path';

const serverConfig = {
	httpServer: {
		port: process.env.PORT || 3000
	},
	database: {
		host: 'ec2-50-16-196-138.compute-1.amazonaws.com' || 'localhost',
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

export { serverConfig }
