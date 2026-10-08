// ============================================================================
//  Aspir by WTS — Outreach Generator
//  Turns a saved prospect into ready-to-send cold outreach (email + DM),
//  written in the founder's voice using their moat and the prospect's signal.
// ============================================================================

export function generateOutreach({ prospect, blueprint }) {
  const concept = blueprint?.concept
  const product = concept?.productName || 'our solution'
  const domain = concept?.domain || prospect.sector || 'your operations'
  const pain = concept?.corePain || `inefficiency in ${domain}`
  const senderEdge =
    (blueprint?.intake?.hardSkills || '').split(/[,;]/)[0]?.trim() ||
    (blueprint?.intake?.domainExpertise || '').split(/[,;]/)[0]?.trim() ||
    'hands-on experience'

  const signalLine = prospect.signal ? prospect.signal.toLowerCase() : 'your current growth stage'

  const emailSubject = `Quick idea for ${prospect.name} on ${prospect.sector.toLowerCase()}`
  const email = [
    `Hi ${prospect.buyerRole},`,
    '',
    `I came across ${prospect.name} — noticed you're ${signalLine}, which usually means ${pain} starts to bite.`,
    '',
    `I've spent years in ${domain} (${senderEdge}), and I built ${product} specifically to fix that for teams like yours. ` +
      `Companies at your stage typically see the difference within the first few weeks.`,
    '',
    `Worth a 15-minute call to see if it's a fit? I can share a quick teardown tailored to ${prospect.name} — no pitch, just value.`,
    '',
    `Best,`,
    `[Your name]`,
  ].join('\n')

  const dm = [
    `Hi — saw that ${prospect.name} is ${signalLine}. I work in ${domain} and built ${product} to solve exactly the kind of ${pain} that tends to show up at that point.`,
    `Would a short teardown tailored to ${prospect.name} be useful? Happy to send it over, no strings.`,
  ].join('\n\n')

  const followUp = [
    `Hi ${prospect.buyerRole}, circling back on my note about ${product}.`,
    '',
    `No worries if the timing's off — I'll leave you with one thought: the teams that tackle ${pain} early at your stage protect a lot of margin later. If it's ever worth a look, I'm one reply away.`,
  ].join('\n')

  return { emailSubject, email, dm, followUp }
}
