-- ============================================================
-- 009_rpc_messages.sql  (v3 — SRF wrapped in FROM subquery)
-- ============================================================

-- ── get_messages ────────────────────────────────────────────
create or replace function public.get_messages(p_conv_id uuid)
returns table (
  id              uuid,
  conversation_id uuid,
  sender_id       uuid,
  body            text,
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  created_at      timestamptz,
  sender          jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    m.body,
    m.attachment_url,
    m.attachment_name,
    m.attachment_type,
    m.created_at,
    jsonb_build_object(
      'id',           p.id,
      'display_name', p.display_name,
      'avatar_url',   p.avatar_url
    ) as sender
  from public.messages m
  join public.profiles p on p.id = m.sender_id
  where m.conversation_id = p_conv_id
    and exists (
      select 1
      from public.get_my_conversation_ids() as conv_id
      where conv_id = p_conv_id
    )
  order by m.created_at asc;
$$;

-- ── post_message ─────────────────────────────────────────────
create or replace function public.post_message(
  p_conv_id       uuid,
  p_sender_id     uuid,
  p_body          text    default null,
  p_attach_url    text    default null,
  p_attach_name   text    default null,
  p_attach_type   text    default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.messages
    (conversation_id, sender_id, body, attachment_url, attachment_name, attachment_type)
  select
    p_conv_id, p_sender_id, p_body, p_attach_url, p_attach_name, p_attach_type
  where exists (
    select 1
    from public.get_my_conversation_ids() as conv_id
    where conv_id = p_conv_id
  );
$$;

grant execute on function public.get_messages(uuid)                          to authenticated;
grant execute on function public.post_message(uuid,uuid,text,text,text,text) to authenticated;

notify pgrst, 'reload schema';
