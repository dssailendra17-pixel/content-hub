import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WordPress credentials from secrets
    const wpUrl = Deno.env.get("WORDPRESS_URL");
    const wpUsername = Deno.env.get("WORDPRESS_USERNAME");
    const wpAppPassword = Deno.env.get("WORDPRESS_APP_PASSWORD");

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      return new Response(
        JSON.stringify({ error: "WordPress credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const altText = formData.get("alt_text") as string || "";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Allowed: jpg, png, gif, webp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 5MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare credentials for WordPress
    const credentials = btoa(`${wpUsername}:${wpAppPassword}`);

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to WordPress Media Library
    const wpResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Type": file.type,
      },
      body: fileBuffer,
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error("WordPress upload error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload to WordPress", details: errorText }),
        { status: wpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaData = await wpResponse.json();

    // Update alt text if provided
    if (altText) {
      await fetch(`${wpUrl}/wp-json/wp/v2/media/${mediaData.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alt_text: altText }),
      });
    }

    return new Response(
      JSON.stringify({
        id: mediaData.id,
        url: mediaData.source_url,
        alt_text: altText,
        title: mediaData.title?.rendered || file.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error uploading media:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
