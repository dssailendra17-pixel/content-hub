import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wpUrl = Deno.env.get('WORDPRESS_URL');
    const wpUsername = Deno.env.get('WORDPRESS_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_APP_PASSWORD');

    if (!wpUrl || !wpUsername || !wpPassword) {
      return new Response(JSON.stringify({ error: 'WordPress credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const credentials = btoa(`${wpUsername}:${wpPassword}`);
    const baseUrl = wpUrl.replace(/\/$/, '');

    // Fetch all categories (paginated)
    let allCategories: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100&page=${page}`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.statusText}`);
      }

      const categories = await res.json();
      allCategories = [...allCategories, ...categories];

      const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
    }

    // Upsert categories to database
    const categoriesToUpsert = allCategories.map((cat: any) => ({
      wordpress_id: cat.id,
      name: cat.name,
      slug: cat.slug,
      synced_at: new Date().toISOString(),
    }));

    // Use service role for upsert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const cat of categoriesToUpsert) {
      const { error } = await supabaseAdmin
        .from('wordpress_categories')
        .upsert(cat, { onConflict: 'wordpress_id' });
      
      if (error) {
        console.error('Error upserting category:', error);
      }
    }

    // Fetch updated categories from our database
    const { data: dbCategories, error: fetchError } = await supabaseClient
      .from('wordpress_categories')
      .select('*')
      .order('name');

    if (fetchError) {
      throw fetchError;
    }

    return new Response(JSON.stringify({ 
      synced: categoriesToUpsert.length,
      categories: dbCategories 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error syncing categories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
