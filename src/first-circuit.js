export function firstCircuit(state) {
  if (state.stage !== 1 || !state.tutorial) return null;
  if (state.tutorial === 2) return { step: "done" };

  const { nodes, edges, techs, rp } = state;
  const generator = nodes.find((node) => node.type === "generator");
  const modem = nodes.find((node) => node.type === "modem");
  const lab = nodes.find((node) => node.type === "lab");
  if (!generator || !modem || !lab) return { step: "restore" };

  const outgoing = (node) =>
    edges.find((edge) => edge.kind === "data" && edge.from === node.id);
  const sourceCable = outgoing(generator);
  const correctors = nodes.filter((node) => node.type === "corrector");
  const corrector =
    correctors.find((node) => node.id === sourceCable?.to) ||
    correctors.find((node) => outgoing(node)?.to === modem.id) ||
    correctors[0];
  const ports = (from, to) => ({ from: from.id, to: to.id });

  if (!techs.includes("parity")) {
    if (rp >= 30) return { step: "research" };
    if (sourceCable?.to === lab.id) return { step: "earn" };
    return sourceCable
      ? { step: "remove-sales", edge: sourceCable.id }
      : { step: "wire-lab", ...ports(generator, lab) };
  }
  if (!corrector) return { step: "build", generator, modem };
  if (sourceCable?.to !== corrector.id)
    return sourceCable
      ? { step: "remove-source", edge: sourceCable.id }
      : { step: "wire-corrector", ...ports(generator, corrector) };

  const correctorCable = outgoing(corrector);
  if (correctorCable?.to !== modem.id)
    return correctorCable
      ? { step: "remove-output", edge: correctorCable.id }
      : { step: "wire-modem", ...ports(corrector, modem) };

  return { step: state.stats.creditsRate >= 1.99 ? "success" : "wait-sales" };
}
