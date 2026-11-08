export function validateRouting(participants, mode, rounds) {
  if (!["once", "turns", "discuss"].includes(mode)) throw new Error("Choose a conversation mode.");
  if (!participants.length || participants.length > 6)
    throw new Error("Choose between one and six AIs.");
  if (new Set(participants).size !== participants.length)
    throw new Error("Choose each AI only once.");
  if (mode === "discuss" && (!Number.isInteger(rounds) || rounds < 1 || rounds > 5))
    throw new Error("Choose between one and five rounds.");
  return { sources: participants, mode, rounds: mode === "discuss" ? rounds : 1 };
}
