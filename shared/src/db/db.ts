import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { Database } from './database'

export interface Env {
	// biome-ignore lint/suspicious/noExplicitAny: D1Database is a global type in Cloudflare Workers
	DB: any
}

export function getDb(env: Env): Kysely<Database> {
	return new Kysely<Database>({
		dialect: new D1Dialect({ database: env.DB }),
	})
}

export function nowMs(): number {
	return Date.now()
}

export function newId(): string {
	return crypto.randomUUID()
}

export function parseJsonArray(str: string): string[] {
	try {
		const parsed = JSON.parse(str)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export function stringifyJsonArray(arr: string[]): string {
	return JSON.stringify(arr)
}
