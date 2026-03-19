#!/usr/bin/env node
import fs from 'fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Load .env.local if present, otherwise .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' })
} else {
  dotenv.config()
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env or .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const refsDefault = [
  'TH 2283 8RU','TH 2282 8RU','TH 2285/S 807','TH 2284/S 807','TH 2264/S 807',
  'TH 2198 PJP','TH 2225/S 807','TH 2227 807','TH 2230 807','TH 2147 807',
  'TH 2141 XW0','TH 2139 TI7','TH 2144/S 08A','TH 2142/S 807','TH 2146 807',
  'TH 2091 003','TH 2091 003','TH 2100/S JBW','TH 1543 003','TH 1543 003'
]

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (const arg of args) {
    if (arg.startsWith('--users=')) out.users = arg.replace('--users=', '').split(',')
    if (arg.startsWith('--refs=')) out.refs = arg.replace('--refs=', '').split(',')
  }
  return out
}

const { users, refs } = parseArgs()
if (!users || users.length === 0) {
  console.error('Usage: node scripts/clone-products-to-users.mjs --users=<user1>,<user2> [--refs=REF1,REF2]')
  process.exit(1)
}

const references = refs && refs.length ? refs : refsDefault

function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function buildUniqueSlug(referenceCode, targetUserId) {
  const baseRef = slugify(referenceCode || 'produto')
  const userSuffix = String(targetUserId).replace(/-/g, '').slice(0, 8)
  let candidate = `${baseRef}-${userSuffix}`

  // Ensure uniqueness even if slug has a global unique index
  for (let i = 0; i < 30; i++) {
    const current = i === 0 ? candidate : `${candidate}-${i + 1}`
    const { data: exists, error } = await supabase
      .from('products')
      .select('id')
      .eq('slug', current)
      .limit(1)

    if (error) throw error
    if (!exists || exists.length === 0) return current
  }

  // Last-resort fallback avoids blocking clone when many collisions happen
  return `${candidate}-${crypto.randomUUID().slice(0, 6)}`
}

async function cloneOneProduct(originalProduct, targetUserId) {
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  const uniqueSlug = await buildUniqueSlug(originalProduct.reference_code, targetUserId)

  const productCopy = { ...originalProduct }
  // Remove fields that should be new/unique
  delete productCopy.id
  delete productCopy.created_at
  delete productCopy.updated_at
  // Clone must have a distinct slug from template/source products
  productCopy.slug = uniqueSlug
  productCopy.user_id = targetUserId
  productCopy.id = newId
  productCopy.created_at = now
  productCopy.updated_at = now

  const { data: inserted, error: insertErr } = await supabase.from('products').insert(productCopy).select().maybeSingle()
  if (insertErr) throw insertErr

  return inserted
}

async function cloneProductImages(originalProductId, newProductId) {
  const { data: imgs, error: imgsErr } = await supabase.from('product_images').select('*').eq('product_id', originalProductId)
  if (imgsErr) throw imgsErr
  if (!imgs || imgs.length === 0) return []

  const toInsert = imgs.map(img => {
    const copy = { ...img }
    delete copy.id
    delete copy.created_at
    delete copy.updated_at
    copy.product_id = newProductId
    copy.id = crypto.randomUUID()
    return copy
  })

  const { data: inserted, error } = await supabase.from('product_images').insert(toInsert).select()
  if (error) throw error
  return inserted
}

async function main() {
  console.log('Cloning', references.length, 'references for', users.length, 'users')

  for (const ref of references) {
    const { data: original, error } = await supabase.from('products').select('*').ilike('reference_code', ref).limit(1).maybeSingle()
    if (error) {
      console.error('Error fetching original for', ref, error.message)
      continue
    }
    if (!original) {
      console.warn('Original not found for', ref)
      continue
    }

    for (const targetUser of users) {
      // skip if target already has same reference
      const { data: exists } = await supabase.from('products').select('id').eq('reference_code', original.reference_code).eq('user_id', targetUser).limit(1)
      if (exists && exists.length) {
        console.log('Skip — target user already has', ref, '(', targetUser, ')')
        continue
      }

      try {
        const newProduct = await cloneOneProduct(original, targetUser)
        await cloneProductImages(original.id, newProduct.id)
        console.log('Cloned', ref, '->', newProduct.id, 'for user', targetUser)
      } catch (err) {
        console.error('Failed to clone', ref, 'for', targetUser, err.message || err)
      }
    }
  }

  console.log('Done')
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
