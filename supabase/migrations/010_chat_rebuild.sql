-- ============================================================
-- 010_chat_rebuild.sql
-- Complete nuclear teardown + clean rebuild of the chat system.
-- Flat, non-recursive RLS guarantees PostgREST/Realtime stability.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── 1. TEARDOWN ───────────────────────────────────────────────
drop trigger  if exists on_new_message                         on public.messages;
drop function if exists public.handle_new_message()            cascade;
drop table    if exists public.messages                        cascade;
drop table    if exists public.conversation_participants       cascade;
drop table    if exists public.conversations                   cascade;

-- Clean up all old helper functions
drop function if exists public.get_my_conversation_ids()       cascade;
drop function if exists public.get_my_conversations()          cascade;
drop function if exists public.find_conversation(uuid)         cascade;
drop function if exists public.get_conversation_partner(uuid)  cascade;
drop function if exists public.get_messages(uuid)              cascade;
drop function if exists public.post_message(uuid,uuid,text,text,text,text) cascade;
drop function if exists public.my_profile_id()                 cascade;
drop function if exists public.test_fetch_messages(uuid)       cascade;

-- ── 2. CLEAN SCHEMA ───────────────────────────────────────────
create table public.conversations (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null    default now(),
  last_message_at timestamptz not null    default now()
);

create table public.conversation_participants (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  profile_id      uuid        not null references public.profiles(id)      on delete cascade,
  unread_count    int         not null    default 0,
  joined_at       timestamptz not null    default now(),
  unique(conversation_id, profile_id)
);
create index cp_profile_idx on public.conversation_participants(profile_id);
create index cp_conv_idx    on public.conversation_participants(conversation_id);

create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references public.profiles(id)      on delete cascade,
  body            text,
  attachment_url  text,
  attachment_type text,
  created_at      timestamptz not null default now()
);
create index msg_conv_idx on public.messages(conversation_id, created_at);

-- ── 3. UNREAD TRIGGER ─────────────────────────────────────────
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- bump last_message_at on the conversation
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  -- increment unread for all participants except the sender
  update public.conversation_participants
     set unread_count = unread_count + 1
   where conversation_id = new.conversation_id
     and profile_id      != new.sender_id;

  return new;
end;
$$;

create trigger on_new_message
  after insert on public.messages
  for each row execute procedure public.handle_new_message();

-- ── 4. RLS ────────────────────────────────────────────────────
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

-- conversation_participants:
--   SELECT open  — required so each user can see who their partner is in the inbox
--   WRITE  restricted to own profile_id row
create policy "participants_select"
  on public.conversation_participants for select
  using (true);

create policy "participants_insert"
  on public.conversation_participants for insert
  with check (profile_id = (select auth.uid()));

create policy "participants_update"
  on public.conversation_participants for update
  using (profile_id = (select auth.uid()));

create policy "participants_delete"
  on public.conversation_participants for delete
  using (profile_id = (select auth.uid()));

-- conversations: visible only if you are a participant (flat exists check)
create policy "conversations_select"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants
       where conversation_id = conversations.id
         and profile_id      = (select auth.uid())
    )
  );

create policy "conversations_insert"
  on public.conversations for insert
  with check (auth.uid() is not null);

-- messages: flat participant check — no joins to conversation_participants from within it
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants
       where conversation_id = messages.conversation_id
         and profile_id      = (select auth.uid())
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_participants
       where conversation_id = messages.conversation_id
         and profile_id      = (select auth.uid())
    )
  );

-- ── 5. GRANTS ─────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant all on public.conversations,
            public.conversation_participants,
            public.messages,
            public.profiles
  to anon, authenticated;

-- ── 6. REALTIME ───────────────────────────────────────────────
-- Tables were just created fresh so we need to add them to the publication
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_participants;

-- ── 7. FORCE SCHEMA CACHE RELOAD ──────────────────────────────
notify pgrst, 'reload schema';
