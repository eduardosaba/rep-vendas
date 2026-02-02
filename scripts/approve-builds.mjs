#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

if (!token || !projectId) {
  console.error('\n❌ Missing required env vars for approve-builds.');
  console.error(
    'Set VERCEL_TOKEN and VERCEL_PROJECT_ID in your environment or .env.local'
  );
  process.exit(1);
}

console.log(
  '🔐 Vercel token and project id found. Fetching recent deployments...'
);

try {
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ Vercel API error:', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  if (!data || !data.deployments) {
    console.log('No deployments found.');
    process.exit(0);
  }

  console.log('\nRecent deployments:');
  data.deployments.forEach((d) => {
    console.log(
      `- id: ${d.uid} | url: ${d.url} | state: ${d.state} | created: ${new Date(d.created * 1000).toISOString()}`
    );
  });

  console.log(
    '\nNote: This script lists deployments. To "approve" a build you typically promote or alias a deployment via the Vercel Dashboard or API.'
  );
  console.log('See: https://vercel.com/docs/rest-api#endpoints/deployments');
} catch (err) {
  console.error('❌ Failed to query Vercel API', err);
  process.exit(1);
}
