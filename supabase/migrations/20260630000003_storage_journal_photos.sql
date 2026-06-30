-- Prywatny bucket "journal-photos" na zdjęcia załączone do konwersacji.
-- Layout w buckecie: <user_id>/<conversation_id>/<file>.<ext>
-- RLS na storage.objects bramkuje dostęp po pierwszym segmencie ścieżki (= user_id).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-photos',
  'journal-photos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "journal-photos read own" ON storage.objects;
CREATE POLICY "journal-photos read own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'journal-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "journal-photos insert own" ON storage.objects;
CREATE POLICY "journal-photos insert own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'journal-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "journal-photos delete own" ON storage.objects;
CREATE POLICY "journal-photos delete own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'journal-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
