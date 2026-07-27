import { supabase } from './client';

export async function seedDistributors() {
  console.log('--- Seeding Distributors ---');

  // 1. DISTRIBUIDORA ALPHA (Happy Path)
  const alphaSlug = 'distribuidora-alpha';
  
  let { data: alphaOrg } = await supabase.from('organizations').select('id').eq('slug', alphaSlug).maybeSingle();
  if (!alphaOrg) {
    const { data: newOrg, error } = await supabase.from('organizations').insert([{
      name: 'Distribuidora Alpha',
      slug: alphaSlug,
      primary_color: '#d97706',
    }]).select('id').single();
    if (error) throw error;
    alphaOrg = newOrg;
    console.log('Created Distribuidora Alpha:', alphaOrg.id);
  } else {
    console.log('Distribuidora Alpha already exists.');
  }

  // Branding for Alpha
  const { data: alphaBrand } = await supabase.from('organization_branding').select('id').eq('organization_id', alphaOrg.id).maybeSingle();
  if (!alphaBrand) {
    await supabase.from('organization_branding').insert([{
      organization_id: alphaOrg.id,
      primary_color: '#d97706',
      secondary_color: '#1e3a8a',
    }]);
    console.log('Created Branding for Alpha');
  }

  // Profiles for Alpha
  const roles = [
    { name: 'Admin Alpha', slug: 'admin-alpha' },
    { name: 'Supervisor Alpha', slug: 'supervisor-alpha' },
    { name: 'Representante Alpha', slug: 'rep-alpha' },
  ];

  for (const role of roles) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('slug', role.slug).eq('organization_id', alphaOrg.id).maybeSingle();
    if (!prof) {
      await supabase.from('profiles').insert([{
        full_name: role.name,
        slug: role.slug,
        organization_id: alphaOrg.id,
        // using a dummy user_id as these are just seeded profiles for context resolution
        id: crypto.randomUUID(), 
      }]);
      console.log(`Created profile: ${role.name}`);
    }
  }

  // 2. DISTRIBUIDORA BETA (Edge cases - Empty state)
  const betaSlug = 'distribuidora-beta';
  let { data: betaOrg } = await supabase.from('organizations').select('id').eq('slug', betaSlug).maybeSingle();
  if (!betaOrg) {
    const { data: newOrg, error } = await supabase.from('organizations').insert([{
      name: 'Distribuidora Beta',
      slug: betaSlug,
    }]).select('id').single();
    if (error) throw error;
    betaOrg = newOrg;
    console.log('Created Distribuidora Beta (Empty state):', betaOrg.id);
  } else {
    console.log('Distribuidora Beta already exists.');
  }
}
