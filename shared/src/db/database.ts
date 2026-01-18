export interface Database {
  users: UsersTable
  webauthn_credentials: WebAuthCredentialsTable
  auth_challenges: AuthChallengesTable
  sessions: SessionsTable
  folders: FoldersTable
  snippets: SnippetsTable
}

export interface UsersTable {
  id: string
  created_at: number
}

export interface WebAuthCredentialsTable {
  credential_id: string
  user_id: string
  public_key: string
  counter: number
  transports: string
  created_at: number
}

export interface AuthChallengesTable {
  id: string
  challenge: string
  type: 'registration' | 'authentication'
  user_id: string | null
  expires_at: number
  created_at: number
}

export interface SessionsTable {
  id: string
  user_id: string
  created_at: number
  expires_at: number
  revoked_at: number | null
}

export interface FoldersTable {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  color: string
  icon: string
  created_at: number
  updated_at: number
  position: number
}

export interface SnippetsTable {
  id: string
  user_id: string
  body: string
  tags: string
  folder_id: string | null
  created_at: number
  updated_at: number
}
