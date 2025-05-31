import * as Y from 'yjs';
import { Observable } from 'lib0/observable';
import { Awareness } from 'y-protocols/awareness';

export class SocketIOProvider extends Observable {
  constructor(roomName, socket, doc) {
    super();
    this.doc = doc;
    this.room = roomName;
    this.socket = socket;
    this.awareness = new Awareness(doc);

    // Join the room
    this.socket.emit('join-room', this.room);

    // Handle incoming Yjs updates
    this.socket.on('yjs-update', (update) => {
      Y.applyUpdate(this.doc, update);
    });

    // Broadcast local updates
    this.doc.on('update', (update) => {
      this.socket.emit('yjs-update', { room: this.room, update });
    });
  }
}
