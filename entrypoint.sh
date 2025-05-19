#!/bin/bash

python manage.py collectstatic --noinput
python manage.py makemigrations --noinput
python manage.py migrate --noinput


# hashes
# password = 1234
# pin = 123456

#INSERT INTO TS_student VALUES 
#(1, 'Alice', 'Smith', 'Marie', 'Engineering', 'Computer Science', 1),
#(2, 'Bob', 'Johnson', '', 'Business', 'Marketing', 2),
#(3, 'Charlie', 'Brown', 'Lee', 'Arts', 'History', 3),
#(4, 'Diana', 'Prince', 'Grace', 'Science', 'Biology', 4),
#(5, 'Ethan', 'Clark', 'James', 'Engineering', 'Mechanical', 1);
#INSERT INTO TS_student VALUES 
#(1, 'Alice', 'Smith', 'Marie'),
#(2, 'Bob', 'Johnson', ''),
#(3, 'Charlie', 'Brown', 'Lee'),
#(4, 'Diana', 'Prince', 'Grace'),
#(5, 'Ethan', 'Clark', 'James');

mysql -h "${DB_HOST}" -u "root" -p"$DB_ROOT_PASSWORD" "$DB_NAME" <<EOF

INSERT INTO TS_Users_role values
(1, 'Admin'),
(2, 'User');

INSERT INTO TS_Users_user (password, ssio_id, ssio_username, ssio_email, ssio_fname, ssio_lname, ssio_userpin, access_type_id) VALUES
('3wSwVKdapGkorDlb9nu/62IzMDdlODMwNmZjODQzOGZhNGE1ZDAzZDgyODBjYzVjNWZlMzM4OWY4ZTJlYmFiYjgwNjEyOTY2NzNhNzVjNjQ=', 1, 'ssio_admin',  'admin@gmail.com', 'SSIO', 'Admin', 'rLUCcZzYzbKfZfsT3B/G7zcyMmFiZjdjYTU0ZTgzNDE0ZTgxOGYxOWE2ZjlmNDAxMTgzMTlhODUwMjA0MTZkNmY4Yjk0YTIxZjhkMDUzN2E=', 1),
('EXsY20E0HTkamff2xqmuQTllY2M0YmQ2YmU4OWQ5N2YzYzQzNDdiMTRiNjlkNDIxOTYwYTkwYzAxNDMzNmRjZWQyMmE2ZDEyOWM5MDYyOGM=', 2, 'ssio_officer', 'officer@gmail.com', 'SSIO', 'Officer', 'wq3H8sZEgc2cCsYucVGuf2UxNGI3YWFhZTVhNDAzNWIxOTUwNTk0NzAwNGFmMWFjMmNlYzZjMzcwNjM4ZTA3YzcwZjIwYzdhZjg0NzhlMjY=', 2),
('u4nFkKGePzVWWOsVg7SLBTUwYzU3ZWU5ZjE5OTMzOWRjZTY1YTYyNGI0YTA4MWQzZDE4OTc1YTVlYThiN2UxNTZmZTczZDRkMTJlODIyOTM=', 3, 'xussio_admin', 'xu.osa.ssio.evs@gmail.com', 'XU', 'OSA', 'qlClV1fZ41+1f61JZRdp1GZmOGFhNDc1MGEzYjM3YzAxOGIxZWZlNDI5NzYyYWQwZDA2ZmIxY2IyN2IyMDZlM2RkM2JiZmRmMzgzMDhkNjg=', 1);

INSERT INTO TS_student VALUES 
(1, 'Alice', 'Smith', 'Marie', 'Engineering', 'Computer Science', 1),
(2, 'Bob', 'Johnson', '', 'Business', 'Marketing', 2),
(3, 'Charlie', 'Brown', 'Lee', 'Arts', 'History', 3),
(4, 'Diana', 'Prince', 'Grace', 'Science', 'Biology', 4),
(5, 'Ethan', 'Clark', 'James', 'Engineering', 'Mechanical', 1);

INSERT INTO TS_violation VALUES
(1, 'Uniform Violation'),
(2, 'Dress Code Violation'),
(3, 'ID Violation'),
(4, 'ID Not Claimed');

EOF

echo "Database initialized."

# Start the application using Gunicorn
python -m gunicorn --bind 0.0.0.0:8002 --workers 3 XUSSIO_TS.wsgi:application