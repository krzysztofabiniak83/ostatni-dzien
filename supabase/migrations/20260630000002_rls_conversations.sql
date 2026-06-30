-- RLS dla conversations + conversation_photos.
-- Zasada: użytkownik widzi/zarządza wyłącznie własnymi rekordami (auth.uid() = user_id).
-- Dla photos dodatkowo wymuszamy, by INSERT trafiał do conversation należącej do tego samego usera.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_photos ENABLE ROW LEVEL SECURITY;

-- conversations
DROP POLICY IF EXISTS conv_select_own ON public.conversations;
CREATE POLICY conv_select_own ON public.conversations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS conv_insert_own ON public.conversations;
CREATE POLICY conv_insert_own ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS conv_delete_own ON public.conversations;
CREATE POLICY conv_delete_own ON public.conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- conversation_photos
DROP POLICY IF EXISTS "select own photos" ON public.conversation_photos;
CREATE POLICY "select own photos" ON public.conversation_photos
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert own photos for own conversation" ON public.conversation_photos;
CREATE POLICY "insert own photos for own conversation" ON public.conversation_photos
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_photos.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete own photos" ON public.conversation_photos;
CREATE POLICY "delete own photos" ON public.conversation_photos
  FOR DELETE
  USING (user_id = auth.uid());
