import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function uploadMediaToWordPress(imageUrl: string, credentials: string, baseUrl: string, altText: string) {
  // Fetch the image
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
  }

  const imageBlob = await imageRes.blob();
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';
  const filename = `featured-image-${Date.now()}.${extension}`;

  // Upload to WordPress
  const uploadRes = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': contentType,
    },
    body: imageBlob,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload media: ${errorText}`);
  }

  const mediaData = await uploadRes.json();

  // Update alt text if provided
  if (altText) {
    await fetch(`${baseUrl}/wp-json/wp/v2/media/${mediaData.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alt_text: altText }),
    });
  }

  return mediaData;
}

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

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can push to WordPress' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { content_ids } = await req.json();

    if (!content_ids || !Array.isArray(content_ids) || content_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'content_ids array is required' }), {
        status: 400,
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch contents with SEO and categories
    const { data: contents, error: fetchError } = await supabaseAdmin
      .from('contents')
      .select(`
        *,
        seo_metadata(*),
        content_categories(
          category:wordpress_categories(*)
        )
      `)
      .in('id', content_ids)
      .eq('push_status', 'available');

    if (fetchError) {
      throw fetchError;
    }

    const results: any[] = [];

    for (const content of contents || []) {
      try {
        let featuredMediaId = null;

        // Upload featured image if exists
        if (content.featured_image_url) {
          const mediaData = await uploadMediaToWordPress(
            content.featured_image_url,
            credentials,
            baseUrl,
            content.featured_image_alt || ''
          );
          featuredMediaId = mediaData.id;
        }

        // Get WordPress category IDs
        const wpCategoryIds = content.content_categories
          ?.map((cc: any) => cc.category?.wordpress_id)
          .filter(Boolean) || [];

        // Prepare post data
        const postData: any = {
          title: content.title,
          content: content.content || '',
          status: content.status === 'published' ? 'publish' : 'draft',
          categories: wpCategoryIds,
        };

        if (featuredMediaId) {
          postData.featured_media = featuredMediaId;
        }

        // Add Rank Math SEO meta if available
        const seo = content.seo_metadata;
        if (seo) {
          postData.meta = {
            rank_math_title: seo.seo_title || '',
            rank_math_description: seo.meta_description || '',
            rank_math_focus_keyword: seo.focus_keyword || '',
          };
          if (seo.url_slug) {
            postData.slug = seo.url_slug;
          }
        }

        // Create or update post
        let wpPostId = content.wordpress_post_id;
        let response;

        if (wpPostId) {
          // Update existing post
          response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${wpPostId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
          });
        } else {
          // Create new post
          response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`WordPress API error: ${errorText}`);
        }

        const wpPost = await response.json();
        wpPostId = wpPost.id;

        // Update content with WordPress post ID and push status
        await supabaseAdmin
          .from('contents')
          .update({
            wordpress_post_id: wpPostId,
            push_status: 'unavailable',
            pushed_at: new Date().toISOString(),
          })
          .eq('id', content.id);

        // Record push history
        await supabaseAdmin
          .from('push_history')
          .insert({
            content_id: content.id,
            pushed_by: profile.id,
            wordpress_post_id: wpPostId,
            wordpress_media_id: featuredMediaId,
            response_data: wpPost,
          });

        results.push({
          content_id: content.id,
          wordpress_post_id: wpPostId,
          success: true,
        });
      } catch (error) {
        console.error(`Error pushing content ${content.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          content_id: content.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in push-to-wordpress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
