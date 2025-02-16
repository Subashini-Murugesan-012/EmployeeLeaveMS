// audit_logs

// create table audit_logs (
//     log_id uuid primary key default gen_random_uuid(),
//     action varchar(50) not null,
//     leave_id uuid not null,
//     performed_by integer not null,
//     old_data jsonb,
//     new_data jsonb,
//     timestamp timestamp default now()
//     )
