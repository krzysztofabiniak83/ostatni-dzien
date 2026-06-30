-- Hybrid search RPC: łączy semantyczne (vector cosine) i lexikalne (tsvector)
-- przez Reciprocal Rank Fusion, z dodatkowym wykładniczym zanikiem rekencji.
-- Zwraca top N kandydatów dla danego query + embedding.

CREATE OR REPLACE FUNCTION public.match_conversations_hybrid(
  p_query text,
  p_query_embedding vector,
  p_limit integer DEFAULT 6,
  p_recency_half_life_days integer DEFAULT 365
)
RETURNS TABLE (
  id uuid,
  started_at timestamp with time zone,
  category conversation_category,
  title text,
  summary text,
  score real
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> p_query_embedding) as rnk
    from public.conversations c
    where c.embedding is not null
    order by c.embedding <=> p_query_embedding
    limit 30
  ),
  kw as (
    select c.id, row_number() over (order by ts_rank_cd(c.search_tsv, plainto_tsquery('pg_catalog.simple'::regconfig, coalesce(p_query,''))) desc) as rnk
    from public.conversations c
    where c.search_tsv @@ plainto_tsquery('pg_catalog.simple'::regconfig, coalesce(p_query,''))
    limit 30
  ),
  fused as (
    select coalesce(v.id, k.id) as id,
           (coalesce(1.0/(60 + v.rnk), 0) + coalesce(1.0/(60 + k.rnk), 0))::real as rrf
    from vec v full outer join kw k using (id)
  ),
  scored as (
    select c.id, c.started_at, c.category, c.title, c.summary,
           (f.rrf * exp(-extract(epoch from (now() - c.started_at))/86400.0/greatest(p_recency_half_life_days,1)))::real as score
    from fused f join public.conversations c on c.id = f.id
  )
  select * from scored order by score desc limit p_limit;
$function$;
