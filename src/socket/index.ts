import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { redis } from "../redis/client";

let io: Server | null = null;
const SOCKET_EVENTS_CHANNEL = "socket-events";

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: process.env.SOCKET_CORS_ORIGIN || "*" },
  });

  io.on("connection", (socket) => {
    socket.on("join-driver", (driverId: string) => {
      console.log("some sort of driver is joined.............");
      socket.join(`driver:${driverId}`);
    });
    socket.on("join-rider", (riderId: string) => {
      console.log("some sort of rider is joinnned..........");
      socket.join(`rider:${riderId}`);
    });
    socket.on("join-ride", (rideId: string) => {
      console.log("some sort of ride room is joinedd.............");
      socket.join(`ride:${rideId}`);
    });
    socket.on("leave-ride", (rideId: string) => {
      console.log("some sort of ride room is left.............");
      socket.leave(`ride:${rideId}`);
    });
  });

  subscribeSocketEvents();
  return io;
};

export const emitSocketEvent = (
  room: string,
  event: string,
  payload: unknown,
) => {
  if (!io) {
    console.log("socket event skipped; Socket.IO not initialized", {
      room,
      event,
      payload,
    });
    return;
  }
  console.log(event, "this event emitted to this room :");
  console.log(room, "this is the room brooo");
  io.to(room).emit(event, payload);
};

export const publishSocketEvent = async (
  room: string,
  event: string,
  payload: unknown,
) => {
  await redis.publish(
    SOCKET_EVENTS_CHANNEL,
    JSON.stringify({ room, event, payload }),
  );
};

const subscribeSocketEvents = () => {
  const subscriber = redis.duplicate();

  subscriber.subscribe(SOCKET_EVENTS_CHANNEL).catch((error) => {
    console.error("failed to subscribe to socket events", error);
  });

  subscriber.on("message", (_channel, message) => {
    try {
      const { room, event, payload } = JSON.parse(message) as {
        room: string;
        event: string;
        payload: unknown;
      };
      emitSocketEvent(room, event, payload);
    } catch (error) {
      console.error("invalid socket event payload", error);
    }
  });
};
