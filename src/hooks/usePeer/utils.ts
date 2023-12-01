import { DataConnection, Peer } from "peerjs";
import isEqual from 'lodash/isequal';
import * as messages from "./messages";

// turn debuggin on via console:
// localStorage.setItem('isDebug', 'true')
const IS_DEBUG = localStorage.getItem('isDebug') === 'true';

// eslint-disable-next-line no-console
const logDebug = (...args: unknown[]) => IS_DEBUG ? console.info('ℹ️ usePeer utils >', ...args) : undefined;
// eslint-disable-next-line no-console
const logError = (...args: unknown[]) => console.error(...args);

type PartialBy<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
let globalPeer: Peer | null | undefined;
let globalConnections: PartialBy<Connection, 'user'|'connection'>[] = JSON.parse(sessionStorage.getItem('conections') || '[]');
let globalRemoteId: string | undefined;
let globalUser: User | undefined;
const globalConnectionChangeHandlers: PeerChangeHandler[] = [];

export type PeerProps = {
  remoteId?: string;
  user?: User;
};

export type PeerChangeHandler = (peer: PeerUtils) => void;

export type PeerUtils = {
  id: string | undefined;
  connections: {
    id: string;
    user?: User;
    isConnected: boolean;
  }[]
};

export type User = {
  name?: string;
  isMain: boolean;
};

type Connection = {
  id: string;
  connection: DataConnection | null;
  user: User;
};

export const get = async (props: PeerProps = {}): Promise<PeerUtils> => {
  cancelDestroy();
  if (!globalPeer) {
    await init(props);
  }
  return getPeerUtils();
};

const getPeerUtils = () => ({
  id: globalPeer?.id,
  connections: globalConnections.map(({id, user, connection}) => ({
    id,
    user,
    isConnected: !!connection,
  })),
});

const init = async ({ remoteId }: PeerProps = {}) => {
  logDebug('init');
  cancelDestroy();
  const storedPeerId = sessionStorage.getItem('peerID');

  if (globalPeer) {
    if ((globalPeer)) {
      logDebug('init: already inited!');
      if (globalRemoteId != remoteId) {
        closeConnections();
        globalConnections = [];
      }
      return;
    }
  }
  if (remoteId) {
    updateConnection({ id: remoteId });
  }

  logDebug(`new Peer(${storedPeerId})`);
  const peer = new Peer(storedPeerId as string, {
    debug: 2,
  });
  globalRemoteId = remoteId;
  globalPeer = peer;

  const peerID = await new Promise<string>((resolve, reject) => {
    peer?.on('open', (id) => {
      logDebug(`ID ${id}: Awaiting connection...`);
      resolve(id);
    });
    peer?.on('error', (err) => {
      logError(err);
      reject(err);
    });
    peer?.on('disconnected', () => {
      logDebug("Connection lost. Reconnecting");
      peer?.reconnect();
    });
    peer?.on('close', () => {
      closeConnections();
      logDebug('Connection destroyed');
      reject('closed');
    });
  });
  if (peerID && peerID !== storedPeerId) {
    sessionStorage.setItem('peerID', peerID);
  }

  peer.on('connection', handleNewConnection);

  globalConnections.forEach(({id, connection}) => {
    if (!connection) {
      establishConnection(id);
    }
  });
  return storedPeerId;
};

export const updateUser = (user?: User) => {
  if (user !== globalUser) {
    globalUser = user;
    globalConnections.forEach(
      ({connection}) => connection && sendIntroduction(connection),
    );
  }
};

const establishConnection = (id: string) => {
  if (!globalPeer) {
    logError('establishConnection failed: no peer initialized');
    return;
  }
  const connection = globalPeer.connect(id, {
    reliable: true,
  });
  handleNewConnection(connection);
};

const updateConnection = (
  {user, connection, id = connection?.peer}: Partial<Connection>,
) => {
  if (!id) {
    logError("Connection could not be pushed, missing ID");
    return false;
  }
  let didUpdate = false;
  const prevConnection = globalConnections.find((conn) => conn.id === id);
  if (prevConnection) {
    if (user && !isEqual(prevConnection.user, user)) {
      prevConnection.user = user;
      didUpdate = true;
    }
    if (connection && prevConnection.connection?.connectionId !== connection.connectionId) {
      prevConnection.connection = connection;
      didUpdate = true;
    }
  } else {
    globalConnections.push({id, user, connection});
    didUpdate = true;
  }
  if (didUpdate) {
    promoteConnectionChange();
  }
  return true;
};

const removeConnection = (id: string) => {
  if (!id) {
    logError("Connection could not be closed, missing ID");
  }
  const index = findConnectionIndex(id);
  if (index === -1) {
    return false;
  }
  delete globalConnections[index].connection;
  return true;
};

const findConnectionIndex = (id: string) => globalConnections.findIndex((conn) => conn.id === id);

const handleNewConnection = (connection: DataConnection) => {
  connection.on('open', () => {
    updateConnection({connection});
    sendIntroduction(connection);

    logDebug(`Connected to: ${connection.peer}`);
    logDebug(connection);

    globalConnections.forEach(({connection: otherConnection}) => {
      if (otherConnection && otherConnection !== connection) {
        messages.sendNewParticipant(otherConnection, connection.peer);
      }
    });

    connection.on('data', (data) => {
      logDebug("Data recieved:", data);
      logDebug(connection);

      const messageData = data as messages.Message;
      switch (messageData.type) {
        case "introduction":
          updateConnection({ connection, user: messageData.user });
          break;
        case "new participant":
          if (findConnectionIndex(messageData.id) === -1) {
            establishConnection(messageData.id);
          }
          break;
      }
    });
    connection.on('close', () => {
      logDebug("Connection closed");
      removeConnection(connection.peer);
    });
  });
  connection.on('error', (error) => {
    logError("Connection error;", error);
    removeConnection(connection.peer);
  });
};

const promoteConnectionChange = () => {
  const peerUtils = getPeerUtils();
  globalConnectionChangeHandlers.forEach(
    (changeHandler) => changeHandler(peerUtils),
  );
  sessionStorage.setItem(
    'conections',
    JSON.stringify(peerUtils.connections.map(
      ({ isConnected, ...otherProps }) => otherProps,
    )),
  );
};

export function onConnectionChange(handleConnectionChange: PeerChangeHandler) {
  removeConnectionChange(handleConnectionChange);
  globalConnectionChangeHandlers.push(handleConnectionChange);
}

export function removeConnectionChange(handleConnectionChange: PeerChangeHandler) {
  const index = globalConnectionChangeHandlers.indexOf(handleConnectionChange);
  if (index === -1) {
    return false;
  }
  globalConnectionChangeHandlers.splice(index, 1);
  return true;
}

///////////////////////////////
// Messages
///////////////////////////////

const sendIntroduction = (connection:DataConnection) => {
  messages.sendIntroduction(connection, {
    id: globalPeer?.id as string,
    user: globalUser,
  });
};

///////////////////////////////
// Destroy
///////////////////////////////

let destroyTimer: NodeJS.Timeout | null;
export const destroy = (doItNow = false) => {
  logDebug('destroy');
  cancelDestroy();
  if (doItNow) {
    destroyNow();
    return;
  } else {
    destroyTimer = setTimeout(destroyNow, 300);
  }
};

const cancelDestroy = () => {
  if (destroyTimer) {
    clearTimeout(destroyTimer);
    destroyTimer = null;
  }
};

const destroyNow = () => {
  logDebug('destroyNow');
  cancelDestroy();
  closeConnections();
  globalPeer?.destroy();
  globalPeer = null;
};

const closeConnections = () => {
  logDebug('destroyConnections');
  globalConnections.forEach((connectionObject) => {
    if (connectionObject.connection) {
      connectionObject.connection.close();
      delete connectionObject.connection;
    }
  });
};
