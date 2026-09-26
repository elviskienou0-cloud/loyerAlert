-- LoyerAlert: protect the realtime presence channel used for the admin online-user view.
-- Any authenticated user may publish their own presence.
-- Only admin/super_admin accounts may read presence state.
create policy "authenticated may publish LoyerAlert presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.topic() = 'loyeralert-online-users'
  and realtime.messages.extension = 'presence'
);

create policy "admins may read LoyerAlert presence"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() = 'loyeralert-online-users'
  and realtime.messages.extension = 'presence'
  and public.is_current_admin()
);
