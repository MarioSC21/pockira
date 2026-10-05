-- 20260906043906 added reminders.repeat_interval but did not extend the
-- column-level grants from 20260817053203, so an authenticated insert that
-- sets it fails with "permission denied for table reminders".
GRANT INSERT (repeat_interval) ON public.reminders TO authenticated;
GRANT UPDATE (repeat_interval) ON public.reminders TO authenticated;
