-- Create roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'member');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  role public.user_role NOT NULL DEFAULT 'member',
  totp_secret TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contents table
CREATE TABLE public.contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  wordpress_post_id BIGINT,
  push_status TEXT NOT NULL DEFAULT 'unavailable' CHECK (push_status IN ('available', 'unavailable')),
  pushed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories cache table (synced from WordPress)
CREATE TABLE public.wordpress_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wordpress_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_categories junction table
CREATE TABLE public.content_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.wordpress_categories(id) ON DELETE CASCADE,
  UNIQUE(content_id, category_id)
);

-- Create SEO metadata table
CREATE TABLE public.seo_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL UNIQUE REFERENCES public.contents(id) ON DELETE CASCADE,
  seo_title TEXT,
  meta_description TEXT,
  url_slug TEXT,
  focus_keyword TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create push history table
CREATE TABLE public.push_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  pushed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wordpress_post_id BIGINT NOT NULL,
  wordpress_media_id BIGINT,
  pushed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_data JSONB
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_history ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Contents policies
CREATE POLICY "Members can view their own contents"
  ON public.contents FOR SELECT
  USING (created_by = public.get_user_profile_id());

CREATE POLICY "Admins can view all contents"
  ON public.contents FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can create contents"
  ON public.contents FOR INSERT
  WITH CHECK (created_by = public.get_user_profile_id());

CREATE POLICY "Members can update their own contents"
  ON public.contents FOR UPDATE
  USING (created_by = public.get_user_profile_id());

CREATE POLICY "Admins can update all contents"
  ON public.contents FOR UPDATE
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Members can delete their own contents"
  ON public.contents FOR DELETE
  USING (created_by = public.get_user_profile_id());

CREATE POLICY "Admins can delete all contents"
  ON public.contents FOR DELETE
  USING (public.get_user_role() = 'admin');

-- WordPress categories policies (public read)
CREATE POLICY "Anyone authenticated can read categories"
  ON public.wordpress_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories"
  ON public.wordpress_categories FOR ALL
  USING (public.get_user_role() = 'admin');

-- Content categories policies
CREATE POLICY "Users can read their content categories"
  ON public.content_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can manage their content categories"
  ON public.content_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can delete their content categories"
  ON public.content_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

-- SEO metadata policies
CREATE POLICY "Users can read their seo metadata"
  ON public.seo_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can manage their seo metadata"
  ON public.seo_metadata FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can update their seo metadata"
  ON public.seo_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can delete their seo metadata"
  ON public.seo_metadata FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

-- Push history policies (admin only write, users can read their own)
CREATE POLICY "Users can view push history for their content"
  ON public.push_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contents 
      WHERE id = content_id 
      AND (created_by = public.get_user_profile_id() OR public.get_user_role() = 'admin')
    )
  );

CREATE POLICY "Admins can insert push history"
  ON public.push_history FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contents_updated_at
  BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_metadata_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-images', 'content-images', true);

-- Storage policies for content images
CREATE POLICY "Anyone can view content images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can upload content images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);