import * as path from 'path';

const serverConfig = {
	httpServer: {
		port: process.env.PORT || 3000
	},
	database: {
		host: 'ec2-54-83-13-119.compute-1.amazonaws.com' || 'localhost',
		port: 5432,
		database: 'd35vus2ptboplp',
		user: 'cockfexyinztco',
		password: 'f39505f5a01590c125bf742d39b6a901d4c7144eab307d7c95c428dcd7538028',
		max: 10, // maksymalna liczba połączeń do bazy danych
		idleTimeoutMillis: 30000
	},
	jsonwebtoken: {
		secret: 'ty4387th4387th'
	}
};

export { serverConfig }
