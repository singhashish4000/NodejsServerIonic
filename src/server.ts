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
				// zapamiętanie identyfikatora użytkownika który się zalogował
				socket['userId'] = value.uz_id;
				socketIoWraper.push(socket);

				io.sockets.emit('login', { type: 'login', time: new Date(), login: value.uz_login, text: 'he logged in' });
			}
		});
	});
	socket.on('message', (data) => {
		authenticationCtrl.authenticate(data.token, (err, value) => {
			if (err) {
				console.log('Event(\'message\'): user authentication error');
			}
			else {
				io.sockets.emit('message', { type: 'message', time: new Date(), login: value.uz_login, text: data.text });
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
				chatCtrl.saveMessage({ type: 'private-message', srcUserId: token.uz_id, destUserId: data.destUserId, message: data.text }).subscribe(value => {
					let srcSocket: SocketIO.Socket = socketIoWraper.findByUserId(token.uz_id);
					let destSocket: SocketIO.Socket = socketIoWraper.findByUserId(data.destUserId);
					srcSocket.emit('private-message', { type: 'private-message', time: value.data.wi_data, login: token.uz_login, text: value.data.wi_tresc });
					if (destSocket) {
						destSocket.emit('private-message', { type: 'private-message', time: value.data.wi_data, login: token.uz_login, text: value.data.wi_tresc });
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
