-- Notifikasi pindah ke email via n8n; approval via Telegram dihapus.
alter table public.profiles drop column if exists telegram_user_id;
