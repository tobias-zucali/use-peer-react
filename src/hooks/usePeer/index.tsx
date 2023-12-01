import { useCallback, useEffect, useState } from "react";

import * as utils from './utils';

type PeerProps = {
  remoteId?: string;
  user?: Partial<utils.User>;
}

export default function usePeer({
  remoteId,
  user,
}: PeerProps = {}) {
  const [peer, setPeer] = useState<utils.PeerUtils>();
  const handleConnectionChange = useCallback<utils.PeerChangeHandler>(
    (newPeer) => setPeer(newPeer),
    [setPeer],
  );

  useEffect(() => {
    const asyncEffect = async () => {
      const peerNew = await utils.get({
        remoteId,
      });
      setPeer(peerNew);
    };
    asyncEffect();

    return () => {
      utils.destroy();
    };
  }, [remoteId, handleConnectionChange]);

  useEffect(() => {
    utils.updateUser({
      ...user,
      isMain: !remoteId,
    });
  }, [remoteId, user]);

  useEffect(() => {
    utils.onConnectionChange(handleConnectionChange);

    return () => {
      utils.removeConnectionChange(handleConnectionChange);
    };
  }, [handleConnectionChange]);

  return peer;
}
