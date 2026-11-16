"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PRODUCT_PROFILE_ID,
  PROFILE_REGISTRY,
  profileById,
  type GameProfile,
} from "@blackjack-edge/engine";

type GameProfileValue = {
  profile: GameProfile;
  profileId: string;
  setProfileId: (id: string) => void;
  profiles: readonly GameProfile[];
};

const GameProfileContext = createContext<GameProfileValue | null>(null);

export function GameProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState(DEFAULT_PRODUCT_PROFILE_ID);

  const setProfileId = useCallback((id: string) => {
    if (profileById(id)) setProfileIdState(id);
  }, []);

  const profile = profileById(profileId) ?? PROFILE_REGISTRY[0];

  const value = useMemo(
    () => ({
      profile,
      profileId: profile.id,
      setProfileId,
      profiles: PROFILE_REGISTRY,
    }),
    [profile, setProfileId]
  );

  return (
    <GameProfileContext.Provider value={value}>
      {children}
    </GameProfileContext.Provider>
  );
}

export function useGameProfile(): GameProfileValue {
  const ctx = useContext(GameProfileContext);
  if (!ctx) {
    throw new Error("useGameProfile erfordert GameProfileProvider.");
  }
  return ctx;
}