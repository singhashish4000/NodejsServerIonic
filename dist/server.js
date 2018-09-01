"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const socketio = require("socket.io");
const server_config_1 = require("./server-config");
const server_router_1 = require("./server-router");
const authentication_controller_1 = require("./authentication-controller");
const chat_controller_1 = require("./chat-controller");
const socket_io_wraper_1 = require("./socket-io-wraper");
const app = express();
const server = http.createServer(app);
const io = socketio.listen(server);
const port = server_config_1.serverConfig.httpServer.port;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api', server_router_1.serverRouter);
io.sockets.on('connection', (socket) => {
    console.log('The user connected to the server');
    socket_io_wraper_1.socketIoWraper.push(socket);
    socket.on('disconnect', (socket) => {
        console.log('The user disconnected from the server');
        socket_io_wraper_1.socketIoWraper.remove(socket);
    });
    socket.on('login', (data) => {
        authentication_controller_1.authenticationCtrl.authenticate(data.token, (err, value) => {
            if (err) {
                console.log('Event(\'login\'): user authentication error');
            }
            else {
                // zapamiętanie identyfikatora użytkownika który się zalogował
                socket['userId'] = value.uz_id;
                socket_io_wraper_1.socketIoWraper.push(socket);
                io.sockets.emit('login', { type: 'login', time: new Date(), login: value.uz_login, text: 'he logged in' });
            }
        });
    });
    socket.on('message', (data) => {
        authentication_controller_1.authenticationCtrl.authenticate(data.token, (err, value) => {
            if (err) {
                console.log('Event(\'message\'): user authentication error');
            }
            else {
                io.sockets.emit('message', { type: 'message', time: new Date(), login: value.uz_login, text: data.text });
            }
        });
    });
    socket.on('private-message', (data) => {
        authentication_controller_1.authenticationCtrl.authenticate(data.token, (err, value) => {
            if (err) {
                console.log('Event(\'private-message\'): user authentication error');
            }
            else {
                let token = value;
                chat_controller_1.chatCtrl.saveMessage({ type: 'private-message', srcUserId: token.uz_id, destUserId: data.destUserId, message: data.text }).subscribe(value => {
                    let srcSocket = socket_io_wraper_1.socketIoWraper.findByUserId(token.uz_id);
                    let destSocket = socket_io_wraper_1.socketIoWraper.findByUserId(data.destUserId);
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
//# sourceMappingURL=server.js.map