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
    // Verify authentication
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

    // Fetch counts in parallel
    const [postsRes, pagesRes, categoriesRes, mediaRes] = await Promise.all([
      fetch(`${baseUrl}/wp-json/wp/v2/posts?per_page=1`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      }),
      fetch(`${baseUrl}/wp-json/wp/v2/pages?per_page=1`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      }),
      fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=1`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      }),
      fetch(`${baseUrl}/wp-json/wp/v2/media?per_page=1`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      }),
    ]);

    const metrics = {
      posts: parseInt(postsRes.headers.get('X-WP-Total') || '0'),
      pages: parseInt(pagesRes.headers.get('X-WP-Total') || '0'),
      categories: parseInt(categoriesRes.headers.get('X-WP-Total') || '0'),
      media: parseInt(mediaRes.headers.get('X-WP-Total') || '0'),
    };

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching WordPress metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
