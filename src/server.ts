import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as socketio from 'socket.io';

import { serverConfig } from './server-config';
import { serverRouter } from './server-router';
import { authenticationCtrl } from './authentication-controller';
import { chatCtrl } from './chat-controller';
import { socketIoWraper } from './socket-io-wraper';

const app = express();
const server = http.createServer(app);
const io = socketio.listen(server);

const port = serverConfig.httpServer.port;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api', serverRouter);

io.sockets.on('connection', (socket) => {
	console.log('The user connected to the server');
	socketIoWraper.push(socket);

	socket.on('disconnect', (socket) => {
		console.log('The user disconnected from the server');
		socketIoWraper.remove(socket);
	});
	socket.on('login', (data) => {
		authenticationCtrl.authenticate(data.token, (err, value) => {
			if (err) {
				console.log('Event(\'login\'): user authentication error');
			}
			else {
				//remembering the user ID who logged in
				socket['userId'] = value.user_id;
				socketIoWraper.push(socket);

				io.sockets.emit('login', { type: 'login', time: new Date(), login: value.user_login, text: 'he logged in' });
			}
		});
	});
	socket.on('message', (data) => {
		authenticationCtrl.authenticate(data.token, (err, value) => {
			if (err) {
				console.log('Event(\'message\'): user authentication error');
			}
			else {
				io.sockets.emit('message', { type: 'message', time: new Date(), login: value.user_login, text: data.text });
			}
		});
	});
	socket.on('private-message', (data) => {
		authenticationCtrl.authenticate(data.token, (err, value) => {
			if (err) {
				console.log('Event(\'private-message\'): user authentication error');
			}
			else {
				let token: any = value;
				chatCtrl.saveMessage({ type: 'private-message', srcUserId: token.user_id, destUserId: data.destUserId, message: data.text }).subscribe(value => {
					let srcSocket: SocketIO.Socket = socketIoWraper.findByUserId(token.user_id);
					let destSocket: SocketIO.Socket = socketIoWraper.findByUserId(data.destUserId);
					srcSocket.emit('private-message', { type: 'private-message', time: value.data.m_data, login: token.user_login, id: token.user_id, text: value.data.m_content });
					if (destSocket) {
						destSocket.emit('private-message', { type: 'private-message', time: value.data.m_data, login: token.user_login, id: token.user_id ,text: value.data.m_content });
					}
				}, error => {
					console.log('Event(\'private-message\'): an error occured ' + error);
				});
			}
		});
	});
});

server.listen(port, function () {
	console.log(`Server running http://localhost:${port}/`);
});
