export type TableView = "free_bet" | "infinite";

export type RoundPhase =
  | "idle"
  | "betting"
  | "dealing"
  | "your_turn"
  | "other_player"
  | "dealer"
  | "settled";

export interface RoundTableState {
  view: TableView;
  phase: RoundPhase;
  yourSeat: number;
  activeSeat: number;
}

export function freshRound(view: TableView): RoundTableState {
  return { view, phase: "idle", yourSeat: 1, activeSeat: 1 };
}

export function openBetting(state: RoundTableState): RoundTableState {
  return { ...state, phase: "betting" };
}

export function beginDeal(state: RoundTableState): RoundTableState {
  return { ...state, phase: "dealing" };
}

export function closeDeal(state: RoundTableState): RoundTableState {
  if (state.view === "infinite") {
    return { ...state, phase: "your_turn" };
  }
  const activeSeat = 1;
  return {
    ...state,
    activeSeat,
    phase: activeSeat === state.yourSeat ? "your_turn" : "other_player",
  };
}

export function setYourSeat(
  state: RoundTableState,
  seat: number
): RoundTableState {
  const yourSeat = clampSeat(seat);
  if (
    state.view === "infinite" ||
    (state.phase !== "other_player" && state.phase !== "your_turn")
  ) {
    return { ...state, yourSeat };
  }
  return {
    ...state,
    yourSeat,
    phase: state.activeSeat === yourSeat ? "your_turn" : "other_player",
  };
}

export function setActiveSeat(
  state: RoundTableState,
  seat: number
): RoundTableState {
  if (state.view === "infinite") {
    return { ...state, phase: "your_turn" };
  }
  const activeSeat = clampSeat(seat);
  return {
    ...state,
    activeSeat,
    phase: activeSeat === state.yourSeat ? "your_turn" : "other_player",
  };
}

export function toDealer(state: RoundTableState): RoundTableState {
  return { ...state, phase: "dealer" };
}

export function settleRound(state: RoundTableState): RoundTableState {
  return { ...state, phase: "settled" };
}

export function turnLabelDe(state: RoundTableState): string {
  if (state.phase === "idle") return "Keine Runde.";
  if (state.phase === "betting") return "Einsatzphase — noch keine Kartenentscheidung.";
  if (state.phase === "dealing") return "Karten werden gegeben.";
  if (state.phase === "dealer") {
    return "Dealer ist am Zug. Die Hole Card darf erst jetzt bekannt sein.";
  }
  if (state.phase === "settled") return "Runde abgerechnet.";
  if (state.view === "infinite") {
    return "Dein Zug. Alle sehen dieselben Startkarten — bewertet wird nur deine Entscheidung.";
  }
  if (state.phase === "your_turn") {
    return `Dein Zug an Platz ${state.yourSeat}.`;
  }
  return `Platz ${state.activeSeat} ist am Zug — nicht deine Hand.`;
}

export function isYourTurn(state: RoundTableState): boolean {
  return state.phase === "your_turn";
}

function clampSeat(seat: number): number {
  if (seat < 1) return 1;
  if (seat > 7) return 7;
  return Math.floor(seat);
}
