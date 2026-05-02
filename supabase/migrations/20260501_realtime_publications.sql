-- ================================================================
-- MIGRATION: Enable Supabase Realtime for chat tables
-- ================================================================

-- REPLICA IDENTITY FULL allows realtime to capture full row data
-- (needed for filtered subscriptions on non-PK columns)
ALTER TABLE public.chat_messages         REPLICA IDENTITY FULL;
ALTER TABLE public.appointment_chats     REPLICA IDENTITY FULL;
ALTER TABLE public.doctor_notifications  REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- (without this, postgres_changes subscriptions never fire)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_notifications;
