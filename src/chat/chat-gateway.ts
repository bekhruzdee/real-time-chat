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
import * as dotenv from 'dotenv';

dotenv.config();

interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

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

    try {
      const oldMessages = await redis.lrange('chat:messages', 0, 19);
      oldMessages.reverse().forEach((msg) => {
        try {
          client.emit('message', JSON.parse(msg));
        } catch (error) {
          console.error('Error parsing message from Redis:', error);
        }
      });
    } catch (error) {
      console.error('Error fetching messages from Redis:', error);
    }

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
    try {
      await redis.lpush('chat:messages', JSON.stringify(message));
      await redis.ltrim('chat:messages', 0, 49);
      client.broadcast.emit('message', message);
      client.emit('message', message);
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  }
}
