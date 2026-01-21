export type UserRole = 'admin' | 'member';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  totp_secret: string | null;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  created_by: string;
  title: string;
  content: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: 'draft' | 'published';
  wordpress_post_id: number | null;
  push_status: 'available' | 'unavailable';
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: Profile;
  categories?: WordPressCategory[];
  seo_metadata?: SeoMetadata;
}

export interface WordPressCategory {
  id: string;
  wordpress_id: number;
  name: string;
  slug: string;
  synced_at: string;
}

export interface ContentCategory {
  id: string;
  content_id: string;
  category_id: string;
}

export interface SeoMetadata {
  id: string;
  content_id: string;
  seo_title: string | null;
  meta_description: string | null;
  url_slug: string | null;
  focus_keyword: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushHistory {
  id: string;
  content_id: string;
  pushed_by: string;
  wordpress_post_id: number;
  wordpress_media_id: number | null;
  pushed_at: string;
  response_data: Record<string, unknown> | null;
}

export interface WordPressMetrics {
  posts: number;
  pages: number;
  categories: number;
  media: number;
}

export interface ContentFormData {
  title: string;
  content: string;
  featured_image_url: string;
  featured_image_alt: string;
  status: 'draft' | 'published';
  category_ids: string[];
  seo_title: string;
  meta_description: string;
  url_slug: string;
  focus_keyword: string;
}
