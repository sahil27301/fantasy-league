insert into league_teams (id, name, owner_name)
values
  ('sahil', 'Sahil XI', 'Sahil'),
  ('shreya', 'Shreya XI', 'Shreya'),
  ('monu', 'Monu XI', 'Monu'),
  ('pooja', 'Pooja XI', 'Pooja'),
  ('ranveer', 'Ranveer XI', 'Ranveer'),
  ('kashish', 'Kashish XI', 'Kashish'),
  ('vedant', 'Vedant XI', 'Vedant'),
  ('tanmay', 'Tanmay XI', 'Tanmay'),
  ('sid', 'Sid XI', 'Sid')
on conflict (id) do update
set
  name = excluded.name,
  owner_name = excluded.owner_name;
