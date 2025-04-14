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
import Redis from 'ioredis';

interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

const redis = new Redis();

@WebSocketGateway(3002, {
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    console.log('New user connected...', client.id);

    // 🔁 Oxirgi 20 ta xabarni Redis'dan olish va yangi client'ga yuborish
    const oldMessages = await redis.lrange('chat:messages', 0, 19);
    oldMessages.reverse().forEach((msg) => {
      client.emit('message', JSON.parse(msg));
    });

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
  async handleNewMessage(
    @MessageBody() message: ChatMessage,
    @ConnectedSocket() client: Socket,
  ) {
    await redis.lpush('chat:messages', JSON.stringify(message));
    await redis.ltrim('chat:messages', 0, 49);

    client.broadcast.emit('message', message);
    client.emit('message', message);
  }
}
