CREATE TABLE users (
	user_id       serial NOT NULL,
	user_login    varchar(254) NOT NULL,
	user_password    varchar(254) NOT NULL,
	user_email    varchar(254) NOT NULL,
	PRIMARY KEY (user_id)
);
CREATE UNIQUE INDEX users_idx_001 ON users(user_email);
CREATE UNIQUE INDEX users_idx_002 ON users(user_login);

CREATE TABLE contacts_status (
	cs_id    serial NOT NULL,
	cs_name varchar(35),
	PRIMARY KEY (cs_id)
);

CREATE TABLE contacts (
	co_id          serial NOT NULL,
	co_user_id_start integer REFERENCES users, -- who initiated the contact
	co_user_id_one    integer REFERENCES users, -- first user
	co_user_id_two    integer REFERENCES users, -- second user
	co_cs_id       integer REFERENCES contacts_status,
	PRIMARY KEY (co_id)
);
CREATE INDEX contacts_idx_001 ON contacts(co_user_id_start);
CREATE INDEX contacts_idx_002 ON contacts(co_user_id_one);
CREATE INDEX contacts_idx_003 ON contacts(co_user_id_two);
CREATE INDEX contacts_idx_004 ON contacts(co_cs_id);

CREATE TABLE message_types (
	mt_id    serial NOT NULL,
	wt_name varchar(35), -- type of message
	PRIMARY KEY (mt_id)
);

CREATE TABLE messages (
	m_id       serial NOT NULL,
	m_data     timestamp DEFAULT current_timestamp,
	m_mt_id    integer REFERENCES message_types,
	m_user_id_one integer REFERENCES users, -- who sent the message
	m_user_id_two integer REFERENCES users, -- who the message was sent to
	m_content    text,
	PRIMARY KEY (m_id)
);
CREATE INDEX messages_idx_001 ON messages(m_user_id_one);
CREATE INDEX messages_idx_002 ON messages(m_user_id_two);
CREATE INDEX messages_idx_003 ON messages(m_mt_id);

INSERT INTO contacts_status (cs_id, cs_name) VALUES (-1, 'deleted');
INSERT INTO contacts_status (cs_id, cs_name) VALUES ( 1, 'active');
INSERT INTO contacts_status (cs_id, cs_name) VALUES ( 2, 'expectant');
INSERT INTO message_types (mt_id, wt_name) VALUES (1, 'private-message');
