-- Apply once to an existing experience_choices table before deploying the IP-aware Worker.
-- Existing rows remain NULL; historical IP addresses cannot be reconstructed.
ALTER TABLE experience_choices
  ADD COLUMN client_ip TEXT CHECK (client_ip IS NULL OR length(client_ip) BETWEEN 3 AND 45);
