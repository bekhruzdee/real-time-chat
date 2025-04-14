import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

@WebSocketGateway(3002, {
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('New user connected...', client.id);

    client.broadcast.emit('user-joined', {
      message: `New User Joined the chat: ${client.id}`,
    });
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnect...', client.id);

    this.server.emit('user-left', {
      message: `User Left the chat: ${client.id}`, 
    });
  }

  @SubscribeMessage('newMessage')
  handleNewMessage(
    @MessageBody() message: ChatMessage,
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('message', message);

    client.emit('message', message);
  }
}
