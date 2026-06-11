// Chicago Board of Ethics — Lobbyist Data Types

export interface LobbyistCombination {
  year: number
  lobbyist_id: number
  employer_id: number
  client_id: number
  lobbyist_salutation?: string
  lobbyist_first_name: string
  lobbyist_middle_initial?: string
  lobbyist_last_name: string
  lobbyist_suffix?: string
  employer_name: string
  client_name: string
}

export interface LobbyingActivity {
  lobbying_activity_id: number
  period_start: string
  period_end: string
  action: 'Administrative' | 'Legislative' | 'Both'
  action_sought: string
  department: string
  client_id: number
  client_name: string
  lobbyist_id: number
  lobbyist_first_name: string
  lobbyist_middle_initial?: string
  lobbyist_last_name: string
  created_date: string
}

export interface Client {
  year: number
  client_id: number
  name: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  created_date: string
  active: string
}

export interface Employer {
  year: number
  employer_id: number
  name: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
  fax?: string
  created_date: string
  active: string
}

export interface Contribution {
  contribution_id: number
  period_start: string
  period_end: string
  contribution_date: string
  recipient: string
  amount: number
  lobbyist_id: number
  lobbyist_first_name: string
  lobbyist_last_name: string
  created_date: string
}

export interface Gift {
  gift_id: number
  period_start: string
  period_end: string
  gift: string
  recipient_first_name: string
  recipient_last_name: string
  recipient_title?: string
  value: number
  department: string
  lobbyist_id: number
  lobbyist_firstname: string
  lobbyist_lastname: string
  created_date: string
}

export interface ExpenditureLarge {
  expenditure_id: number
  period_start: string
  period_end: string
  lobbyist_id: number
  lobbyist_first_name: string
  lobbyist_middle_initial?: string
  lobbyist_last_name: string
  action?: string
  amount: number
  expenditure_date: string
  purpose: string
  recipient: string
  client_id: number
  client_name: string
  created_date: string
}

export interface ExpenditureSmall {
  compensation_id: number
  period_start: string
  period_end: string
  lobbyist_id: number
  lobbyist_first_name: string
  lobbyist_middle_initial?: string
  lobbyist_last_name: string
  compensation_to_others_expense?: number
  office_expense?: number
  personal_sustenance_expense?: number
  public_education_expense?: number
  other_expenses?: number
  total_expenses: number
  client_id: number
  client_name: string
  created_date: string
}

export interface Compensation {
  compensation_id: number
  period_start: string
  period_end: string
  lobbyist_id: number
  lobbyist_first_name: string
  lobbyist_middle_initial?: string
  lobbyist_last_name: string
  compensation_amount: number
  client_id: number
  client_name: string
  created_date: string
}

// Aggregated views
export interface LobbyistSummary {
  lobbyist_id: number
  name: string
  employer_name: string
  clients: string[]
  total_compensation: number
  total_contributions: number
  total_expenditures: number
  total_gifts: number
  departments: string[]
  activity_count: number
}

export interface ClientSummary {
  client_id: number
  name: string
  city?: string
  state?: string
  lobbyists: string[]
  departments: string[]
  activity_count: number
  total_compensation: number
}

export interface DepartmentSummary {
  department: string
  activity_count: number
  unique_clients: number
  unique_lobbyists: number
  recent_actions: string[]
}

export interface AnomalyAlert {
  id: string
  type: 'quid_pro_quo' | 'gift_timing' | 'volume_spike' | 'dark_money' | 'concentration'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  lobbyist_name?: string
  client_name?: string
  department?: string
  amount?: number
  date?: string
  entities: string[]
}
