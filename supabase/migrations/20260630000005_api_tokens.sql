-- Personal Access Tokens (PAT) — długotrwałe tokeny API/MCP per user.
-- Przechowujemy WYŁĄCZNIE SHA-256 hash; surowy token pokazujemy jedynie raz przy tworzeniu.
-- `token_prefix` pozwala na podgląd w UI (np. "od_pat_abc1…") bez ujawniania reszty.

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  token_hash    text NOT NULL UNIQUE,
  token_prefix  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  expires_at    timestamptz
);

CREATE INDEX IF NOT EXISTS api_tokens_user_id_idx ON public.api_tokens(user_id);
CREATE INDEX IF NOT EXISTS api_tokens_token_hash_idx ON public.api_tokens(token_hash);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_tokens_select_own ON public.api_tokens;
CREATE POLICY api_tokens_select_own ON public.api_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS api_tokens_insert_own ON public.api_tokens;
CREATE POLICY api_tokens_insert_own ON public.api_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update tylko do revoke (revoked_at) — pozostałe pola są niemutowalne z poziomu klienta.
DROP POLICY IF EXISTS api_tokens_update_own ON public.api_tokens;
CREATE POLICY api_tokens_update_own ON public.api_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS api_tokens_delete_own ON public.api_tokens;
CREATE POLICY api_tokens_delete_own ON public.api_tokens
  FOR DELETE USING (auth.uid() = user_id);
