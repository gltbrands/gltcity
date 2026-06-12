export const TOPICS = {
  ZONING: {
    label: 'Zoning & Land Use',
    color: '#f59e0b',
    emoji: '🏗',
    commissioner: 'DPD Commissioner Ciere Boateng',
    dept: 'Dept of Planning & Development (DPD)',
    approves: 'Map amendments, variances, planned developments, landmark designations',
  },
  CONSTRUCTION: {
    label: 'Construction & Permits',
    color: '#f97316',
    emoji: '🔨',
    commissioner: 'DOB Commissioner Matthew Beaudet',
    dept: 'Department of Buildings (DOB)',
    approves: 'Building permits, demolition, occupancy certificates, inspections',
  },
  CANNABIS: {
    label: 'Cannabis',
    color: '#4ade80',
    emoji: '🌿',
    commissioner: 'BACP Commissioner Kenneth Meyer',
    dept: 'Business Affairs & Consumer Protection (BACP)',
    approves: 'Dispensary licenses, social equity applications, craft grower permits',
  },
  LIQUOR: {
    label: 'Liquor & Licensing',
    color: '#a78bfa',
    emoji: '🍷',
    commissioner: 'BACP Commissioner Kenneth Meyer',
    dept: 'Business Affairs & Consumer Protection (BACP)',
    approves: 'Liquor licenses, entertainment licenses, late-hour extensions',
  },
  TIF: {
    label: 'TIF & Development',
    color: '#22d3ee',
    emoji: '💹',
    commissioner: 'DPD Commissioner Ciere Boateng',
    dept: 'Dept of Planning & Development (DPD)',
    approves: 'TIF district creation/amendments, developer agreements, subsidy approvals',
  },
  CONTRACTS: {
    label: 'Contracts & Procurement',
    color: '#60a5fa',
    emoji: '📄',
    commissioner: 'DPS Commissioner Doris Tolbert',
    dept: 'Dept of Procurement Services (DPS)',
    approves: 'City contracts, RFP awards, vendor qualifications, sole-source approvals',
  },
  TRANSIT: {
    label: 'Transportation',
    color: '#fbbf24',
    emoji: '🚇',
    commissioner: 'CDOT Commissioner Tom Carney',
    dept: 'Chicago Dept of Transportation (CDOT)',
    approves: 'Street closures, bike infrastructure, special permits, public way use',
  },
  HEALTHCARE: {
    label: 'Healthcare',
    color: '#f472b6',
    emoji: '🏥',
    commissioner: 'CDPH Commissioner Dr. Olusimbo Ige',
    dept: 'Chicago Dept of Public Health (CDPH)',
    approves: 'Public health licensing, facility permits, environmental health violations',
  },
  ENVIRONMENT: {
    label: 'Environment & Water',
    color: '#34d399',
    emoji: '🌱',
    commissioner: 'DOE Commissioner Angela Tovar',
    dept: 'Dept of Environment / Water Management',
    approves: 'Environmental permits, waste management, air/water quality variances',
  },
  HOUSING: {
    label: 'Affordable Housing',
    color: '#818cf8',
    emoji: '🏠',
    commissioner: 'DOH Commissioner Lissette Castañeda',
    dept: 'Department of Housing (DOH)',
    approves: 'Affordable housing subsidies, LIHTC allocations, home repair programs',
  },
  FINANCE: {
    label: 'Finance & Tax',
    color: '#38bdf8',
    emoji: '💰',
    commissioner: 'CFO Jennie Huang Bennett',
    dept: 'Dept of Finance / Office of Budget & Management',
    approves: 'Tax abatements, bond issuances, special assessments, fee waivers',
  },
  ETHICS: {
    label: 'Ethics & Compliance',
    color: '#94a3b8',
    emoji: '⚖',
    commissioner: 'Chicago Board of Ethics',
    dept: 'Board of Ethics',
    approves: 'Lobbyist registrations, ethics rulings, campaign finance compliance',
  },
  OTHER: {
    label: 'General / Other',
    color: '#475569',
    emoji: '📋',
    commissioner: 'Various departments',
    dept: 'Various',
    approves: 'Miscellaneous city services and administrative matters',
  },
} as const

export type TopicKey = keyof typeof TOPICS

export function classifyTopic(department: string, actionSought: string): TopicKey {
  const t = `${department} ${actionSought}`.toLowerCase()
  if (/cannabis|marijuana|dispensary|cultivation|infus|cbd/.test(t)) return 'CANNABIS'
  if (/liquor|alcohol|tavern|\bbar\b|spirit|winery|brew/.test(t)) return 'LIQUOR'
  if (/tif\b|tax increment|developer agreement|increment financing/.test(t)) return 'TIF'
  if (/zon|rezone|variance|planned dev|map amend|dpd|planning|land use|zba|zoning board/.test(t)) return 'ZONING'
  if (/permit|building|demolit|construct|structur|dob\b|inspection|renovation/.test(t)) return 'CONSTRUCTION'
  if (/contract|procurement|bid\b|rfp\b|vendor|purchase order|supply|award/.test(t)) return 'CONTRACTS'
  if (/cdot|transportation|transit|bike lane|pedestrian|parking|road|traffic|bus|cta/.test(t)) return 'TRANSIT'
  if (/health|hospital|clinic|medical|healthcare|cph\b|hhs\b|public health/.test(t)) return 'HEALTHCARE'
  if (/environment|sustainability|green|climate|water|mwrd|pollution/.test(t)) return 'ENVIRONMENT'
  if (/housing|affordable|tenant|hud\b|cha\b|rental|residential subsid/.test(t)) return 'HOUSING'
  if (/finance|tax\b|budget|bond\b|fiscal|revenue|assessment|treasury/.test(t)) return 'FINANCE'
  if (/ethics|compliance|lobbying|disclosure|conflict/.test(t)) return 'ETHICS'
  return 'OTHER'
}

export type WardTopicData = {
  total: number
  count: number
  topLobbyists: string[]
  topClients: string[]
}

export type WardIntelResponse = {
  wardTopics: Record<number, Partial<Record<TopicKey, WardTopicData>>>
  topicTotals: Record<string, { total: number; count: number; topWards: number[] }>
  overallWard: Record<number, { total: number; count: number }>
}
