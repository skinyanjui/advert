import "server-only"

export function legalOperatorIdentity() {
  const name = process.env.LEGAL_OPERATOR_NAME?.trim() || null
  const address = process.env.LEGAL_OPERATOR_ADDRESS?.trim() || null
  return { name, address, complete: Boolean(name && address) }
}

export function privacyOfficerContacts() {
  return {
    dpoEmail: process.env.PRIVACY_DPO_EMAIL?.trim() || null,
    euRepresentative: process.env.PRIVACY_EU_REPRESENTATIVE?.trim() || null,
  }
}

export function dmcaAgentConfiguration() {
  const name = process.env.DMCA_AGENT_NAME?.trim() || null
  const email = process.env.DMCA_AGENT_EMAIL?.trim() || null
  const address = process.env.DMCA_AGENT_ADDRESS?.trim() || null
  const phone = process.env.DMCA_AGENT_PHONE?.trim() || null
  const registered = process.env.DMCA_AGENT_REGISTERED === "1"
  return {
    name,
    email,
    address,
    phone,
    registered,
    contactComplete: Boolean(name && email && address),
  }
}


export function legalPublicationStatus() {
  const operator = legalOperatorIdentity()
  const approved = process.env.LEGAL_DOCUMENTS_APPROVED === "1"
  return {
    approved,
    operatorComplete: operator.complete,
    ready: approved && operator.complete,
  }
}
