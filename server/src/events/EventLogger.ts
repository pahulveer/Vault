import { randomUUID } from 'crypto';

export interface SystemEvent {
  eventId: string;
  type: string;
  timestamp: string;
  message: string;
  objectId?: string;
  nodeId?: string;
}

class EventLogger {
  private events: SystemEvent[] = [];

  log(type: string, message: string, objectId?: string, nodeId?: string): SystemEvent {
    const event: SystemEvent = {
      eventId: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      message,
      objectId,
      nodeId
    };
    this.events.push(event);
    console.log(`[EVENT] ${type}: ${message}`);
    return event;
  }

  getRecentEvents(limit: number = 50): SystemEvent[] {
    return this.events.slice(-limit).reverse();
  }

  clear() {
    this.events = [];
  }
}

export const eventLogger = new EventLogger();
