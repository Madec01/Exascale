export function firstCircuit(state) {
  if (state.stage !== 1 || !state.tutorial) return null;
  if (state.tutorial === 2) return { step: "done" };

  const { nodes, edges, techs, rp, stats } = state;
  const generators = nodes.filter((node) => node.type === "generator");
  const labs = nodes.filter((node) => node.type === "lab");
  const modem = nodes.find((node) => node.type === "modem");
  if (!generators.length || !labs.length || !modem) return { step: "restore" };
  const cables = edges.filter((edge) => edge.kind === "data");
  const feeds = (target) => generators.find((node) =>
    cables.some((edge) => edge.from === node.id && edge.to === target.id)
  );
  const lab = labs.find(feeds) || labs[0];
  const researchSource = feeds(lab);
  const free = generators.find((node) => !cables.some((edge) => edge.from === node.id));

  if (!researchSource && !stats.rpRate) {
    if (free && (generators.length > 1 || stats.creditsRate))
      return { step: "wire", from: free.id, to: lab.id };
    return { step: "build" };
  }
  if (researchSource && researchSource.level < 2 && !techs.includes("parity"))
    return { step: "generator", node: researchSource.id };
  if (researchSource && lab.level < 2 && !techs.includes("parity"))
    return { step: "lab", node: lab.id };
  if (techs.includes("parity")) return { step: "success" };
  return { step: rp >= 30 ? "research" : "earn" };
}
