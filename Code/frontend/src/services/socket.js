import { io } from 'socket.io-client';
import { API_SERVER_URL } from '../config/apiConfig';

let socket;

const getSocket = () => {
  const token = sessionStorage.getItem('conmat_token');

  if (!socket) {
    socket = io(API_SERVER_URL, {
      auth: token ? { token } : {},
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  } else {
    const previousToken = socket.auth?.token || null;
    if (socket.connected && previousToken !== token) socket.disconnect();
    socket.auth = token ? { token } : {};
  }

  return socket;
};

export const subscribeToBidUpdates = (handler) => {
  return subscribeToSocketEvent('bids:changed', handler);
};

export const subscribeToSocketEvent = (eventName, handler) => {
  const client = getSocket();
  if (!client) return () => {};

  client.on(eventName, handler);
  if (!client.connected) client.connect();

  return () => {
    client.off(eventName, handler);
    const activeEvents = ['bids:changed', 'notifications:changed', 'orders:changed', 'inventory:changed', 'account:changed', 'marketplace:changed'];
    if (!activeEvents.some((event) => client.hasListeners(event))) client.disconnect();
  };
};
