-- Label aktor otomatis cukup "system", tanpa menyebut n8n.
update public.invoice_events set actor_email = 'system' where actor_email = 'system (n8n)';
