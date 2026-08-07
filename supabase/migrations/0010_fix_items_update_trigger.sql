-- Fix items update trigger: items uses last_updated_at, not updated_at.

create or replace function public.touch_items_last_updated_at()
returns trigger as $$
begin
  new.last_updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_items_updated on public.items;
create trigger trg_items_updated
before update on public.items
for each row execute function public.touch_items_last_updated_at();
