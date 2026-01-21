-- Promote dssailendra98@gmail.com as admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'dssailendra98@gmail.com';