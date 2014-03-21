CREATE table if not exists websites (
  url varchar(50),
  ct blob,
  iv blob,
  s blob
);

/*
create user 'wh2' identified by '';
grant all privileges on *.* to 'wh2'@'localhost' with grant option;
*/
